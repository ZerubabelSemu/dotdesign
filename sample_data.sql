-- Add sample categories
INSERT INTO categories (name, description, slug, image_url) VALUES
('Dresses', 'Elegant dresses for every occasion', 'dresses', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500'),
('Tops', 'Stylish tops and blouses', 'tops', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500'),
('Accessories', 'Beautiful accessories to complete your look', 'accessories', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500'),
('Traditional', 'Ethiopian traditional wear', 'traditional', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500');

-- Add sample products
INSERT INTO products (name, description, price, category_id, material, care_instructions, stock, featured, published) VALUES
('Elegant Evening Dress', 'A stunning evening dress perfect for special occasions. Features intricate detailing and a flattering silhouette.', 2500.00, (SELECT id FROM categories WHERE slug = 'dresses'), 'Silk blend', 'Dry clean only', 15, true, true),
('Classic White Blouse', 'A timeless white blouse that pairs perfectly with any outfit. Made from premium cotton.', 850.00, (SELECT id FROM categories WHERE slug = 'tops'), 'Premium cotton', 'Machine wash cold', 25, true, true),
('Ethiopian Traditional Shirt', 'Beautiful traditional Ethiopian shirt with cultural patterns and modern fit.', 1200.00, (SELECT id FROM categories WHERE slug = 'traditional'), 'Cotton blend', 'Hand wash recommended', 20, true, true),
('Designer Handbag', 'Elegant leather handbag perfect for daily use or special occasions.', 1800.00, (SELECT id FROM categories WHERE slug = 'accessories'), 'Genuine leather', 'Clean with leather conditioner', 12, false, true),
('Summer Maxi Dress', 'Light and breezy maxi dress perfect for warm weather. Features beautiful floral patterns.', 1500.00, (SELECT id FROM categories WHERE slug = 'dresses'), 'Cotton blend', 'Machine wash gentle', 18, false, true),
('Business Blazer', 'Professional blazer perfect for office wear or formal events.', 2200.00, (SELECT id FROM categories WHERE slug = 'tops'), 'Wool blend', 'Dry clean only', 10, false, true),
('Cultural Necklace', 'Handcrafted traditional Ethiopian necklace with authentic design.', 450.00, (SELECT id FROM categories WHERE slug = 'accessories'), 'Silver and beads', 'Store in jewelry box', 30, false, true),
('Casual Denim Jacket', 'Trendy denim jacket perfect for casual outings.', 950.00, (SELECT id FROM categories WHERE slug = 'tops'), 'Denim', 'Machine wash cold', 22, false, true);

-- Add product images
INSERT INTO product_images (product_id, image_url, alt_text, display_order) VALUES
-- Evening Dress images
((SELECT id FROM products WHERE name = 'Elegant Evening Dress'), 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800', 'Elegant Evening Dress Front View', 1),
((SELECT id FROM products WHERE name = 'Elegant Evening Dress'), 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800', 'Elegant Evening Dress Back View', 2),
-- White Blouse images
((SELECT id FROM products WHERE name = 'Classic White Blouse'), 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800', 'Classic White Blouse', 1),
-- Traditional Shirt images
((SELECT id FROM products WHERE name = 'Ethiopian Traditional Shirt'), 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800', 'Ethiopian Traditional Shirt', 1),
-- Handbag images
((SELECT id FROM products WHERE name = 'Designer Handbag'), 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800', 'Designer Handbag', 1),
-- Maxi Dress images
((SELECT id FROM products WHERE name = 'Summer Maxi Dress'), 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800', 'Summer Maxi Dress', 1),
-- Blazer images
((SELECT id FROM products WHERE name = 'Business Blazer'), 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800', 'Business Blazer', 1),
-- Necklace images
((SELECT id FROM products WHERE name = 'Cultural Necklace'), 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800', 'Cultural Necklace', 1),
-- Denim Jacket images
((SELECT id FROM products WHERE name = 'Casual Denim Jacket'), 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800', 'Casual Denim Jacket', 1);

-- Add product variants (sizes)
INSERT INTO product_variants (product_id, size, stock, price_adjustment) VALUES
-- Evening Dress sizes
((SELECT id FROM products WHERE name = 'Elegant Evening Dress'), 'S', 5, 0),
((SELECT id FROM products WHERE name = 'Elegant Evening Dress'), 'M', 5, 0),
((SELECT id FROM products WHERE name = 'Elegant Evening Dress'), 'L', 3, 0),
((SELECT id FROM products WHERE name = 'Elegant Evening Dress'), 'XL', 2, 0),
-- White Blouse sizes
((SELECT id FROM products WHERE name = 'Classic White Blouse'), 'S', 8, 0),
((SELECT id FROM products WHERE name = 'Classic White Blouse'), 'M', 10, 0),
((SELECT id FROM products WHERE name = 'Classic White Blouse'), 'L', 7, 0),
-- Traditional Shirt sizes
((SELECT id FROM products WHERE name = 'Ethiopian Traditional Shirt'), 'S', 6, 0),
((SELECT id FROM products WHERE name = 'Ethiopian Traditional Shirt'), 'M', 8, 0),
((SELECT id FROM products WHERE name = 'Ethiopian Traditional Shirt'), 'L', 6, 0),
-- Maxi Dress sizes
((SELECT id FROM products WHERE name = 'Summer Maxi Dress'), 'S', 6, 0),
((SELECT id FROM products WHERE name = 'Summer Maxi Dress'), 'M', 6, 0),
((SELECT id FROM products WHERE name = 'Summer Maxi Dress'), 'L', 6, 0),
-- Blazer sizes
((SELECT id FROM products WHERE name = 'Business Blazer'), 'S', 3, 0),
((SELECT id FROM products WHERE name = 'Business Blazer'), 'M', 4, 0),
((SELECT id FROM products WHERE name = 'Business Blazer'), 'L', 3, 0),
-- Denim Jacket sizes
((SELECT id FROM products WHERE name = 'Casual Denim Jacket'), 'S', 7, 0),
((SELECT id FROM products WHERE name = 'Casual Denim Jacket'), 'M', 8, 0),
((SELECT id FROM products WHERE name = 'Casual Denim Jacket'), 'L', 7, 0);
