const router = require('express').Router();
const Part = require('../models/Part');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadPart, deleteCloudinaryImage } = require('../utils/cloudinary');

// GET /api/parts/meta — brands, categories for sidebar filters
router.get('/meta', async (req, res) => {
  try {
    const [brands, categories, priceAgg] = await Promise.all([
      Part.distinct('brand', { isActive: true }),
      Part.distinct('category', { isActive: true }),
      Part.aggregate([{ $group: { _id: null, max: { $max: '$price' } } }]),
    ]);
    res.json({ brands: brands.sort(), categories: categories.sort(), maxPrice: priceAgg[0]?.max || 50000 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/parts — list with search/filter/sort/pagination
router.get('/', async (req, res) => {
  try {
    const { q, brand, category, condition, minPrice, maxPrice, sort, rating, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (q) filter.$text = { $search: q };
    if (brand)    filter.brand     = { $in: brand.split(',') };
    if (category) filter.category  = { $in: category.split(',') };
    if (condition) filter.condition = { $in: condition.split(',') };
    if (minPrice || maxPrice) filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
    if (rating)   filter.rating    = { $gte: Number(rating) };

    const sortMap = {
      price_asc:  { price: 1 },
      price_desc: { price: -1 },
      name:       { name: 1 },
      rating:     { rating: -1 },
      newest:     { createdAt: -1 },
    };
    const sortObj = sortMap[sort] || { createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const [parts, total] = await Promise.all([
      Part.find(filter).sort(sortObj).skip(skip).limit(Number(limit)),
      Part.countDocuments(filter),
    ]);

    res.json({ total, page: Number(page), pages: Math.ceil(total / Number(limit)), parts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/parts/:id
router.get('/:id', async (req, res) => {
  try {
    const part = await Part.findById(req.params.id);
    if (!part || !part.isActive) return res.status(404).json({ error: 'Part not found' });
    res.json(part);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/parts — admin creates part (with optional images)
router.post('/', protect, adminOnly, uploadPart.array('images', 10), async (req, res) => {
  try {
    const { name, brand, model, year, category, condition, price, stock, desc, icon } = req.body;
    if (!name || !brand || !model || !price) return res.status(400).json({ error: 'name, brand, model, price required' });

    const count = await Part.countDocuments();
    const sku = `${brand.slice(0,2).toUpperCase()}-${category?.slice(0,2).toUpperCase() || 'XX'}-${String(count+1).padStart(3,'0')}`;

    const images = (req.files || []).map(f => ({ url: f.path, publicId: f.filename }));

    const part = await Part.create({
      name, brand, model, year: year || '', category, condition,
      price: Number(price), stock: Number(stock) || 1,
      desc: desc || '', icon: icon || '🔧', sku, images,
    });
    res.status(201).json(part);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/parts/:id — admin updates part details
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const allowed = ['name','brand','model','year','category','condition','price','stock','desc','icon','isActive'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    if (updates.price) updates.price = Number(updates.price);
    if (updates.stock !== undefined) updates.stock = Number(updates.stock);

    const part = await Part.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!part) return res.status(404).json({ error: 'Part not found' });
    res.json(part);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/parts/:id — admin soft-deletes
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const part = await Part.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!part) return res.status(404).json({ error: 'Part not found' });
    res.json({ message: 'Part removed from listing' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/parts/:id/images — admin uploads images
router.post('/:id/images', protect, adminOnly, uploadPart.array('images', 10), async (req, res) => {
  try {
    const part = await Part.findById(req.params.id);
    if (!part) return res.status(404).json({ error: 'Part not found' });
    const newImages = (req.files || []).map(f => ({ url: f.path, publicId: f.filename }));
    part.images.push(...newImages);
    await part.save();
    res.json({ images: part.images });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/parts/:id/images/:publicId — admin removes one image
router.delete('/:id/images/:publicId', protect, adminOnly, async (req, res) => {
  try {
    const part = await Part.findById(req.params.id);
    if (!part) return res.status(404).json({ error: 'Part not found' });
    const pid = decodeURIComponent(req.params.publicId);
    await deleteCloudinaryImage(pid);
    part.images = part.images.filter(img => img.publicId !== pid);
    await part.save();
    res.json({ images: part.images });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/parts/:id/reviews — customer posts a review
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating) return res.status(400).json({ error: 'Rating required' });
    const part = await Part.findById(req.params.id);
    if (!part) return res.status(404).json({ error: 'Part not found' });

    const alreadyReviewed = part.reviews.find(r => String(r.userId) === String(req.user._id));
    if (alreadyReviewed) return res.status(400).json({ error: 'Already reviewed this part' });

    part.reviews.push({ userId: req.user._id, userName: req.user.name, rating: Number(rating), comment });
    part.computeRating();
    await part.save();
    res.status(201).json({ rating: part.rating, numReviews: part.numReviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
