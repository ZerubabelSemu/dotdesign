import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart } from "lucide-react";
import { useProduct } from "@/hooks/useProducts";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { toast } from "sonner";

const ProductDetail = () => {
  const { id } = useParams();
  const { data: product, isLoading } = useProduct(id || "");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [fitZoom, setFitZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(3);
  const [pan, setPan] = useState<{x:number;y:number}>({x:0,y:0});
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x:number;y:number}>({x:0,y:0});
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const { addItem } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  // Reset gallery when product changes
  useEffect(() => {
    setActiveImageIndex(0);
    setZoom(1);
    setPan({x:0,y:0});
  }, [product?.id]);

  // Images ordered by display_order
  const orderedImages = (product?.product_images || [])
    .slice()
    .sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0));
  const hasImages = orderedImages.length > 0;
  const mainImage = hasImages ? orderedImages[Math.min(activeImageIndex, orderedImages.length - 1)] : undefined;
  const goPrev = () => setActiveImageIndex((i) => (i > 0 ? i - 1 : i));
  const goNext = () => setActiveImageIndex((i) => (i < orderedImages.length - 1 ? i + 1 : i));
  const openLightbox = () => {
    if (!hasImages) return;
    setLightboxOpen(true);
    setPan({x:0,y:0});
  };
  const closeLightbox = () => {
    setLightboxOpen(false);
    setPan({x:0,y:0});
  };
  const zoomIn = () => setZoom((z) => Math.min(maxZoom, parseFloat((z + 0.5).toFixed(2))));
  const zoomOut = () => setZoom((z) => Math.max(fitZoom, parseFloat((z - 0.5).toFixed(2))));

  // Compute a zoom that fits the image within the viewport when opening lightbox or changing image
  useEffect(() => {
    if (!lightboxOpen || !orderedImages[activeImageIndex]) return;
    const url = orderedImages[activeImageIndex].image_url;
    const img = new Image();
    img.src = url;
    img.onload = () => {
      const vw = window.innerWidth; // full width
      const vh = window.innerHeight - 56; // account for lightbox top bar height
      const z = Math.min(vw / img.width, vh / img.height) || 1;
      setFitZoom(z);
      setMaxZoom(z * 3);
      setZoom(z);
      setPan({ x: 0, y: 0 });
    };
  }, [lightboxOpen, activeImageIndex]);

  const handleAddToCart = () => {
    if (!product) return;

    if (product.product_variants && product.product_variants.length > 0 && !selectedSize) {
      toast.error("Please select a size");
      return;
    }

    const selectedVariant = product.product_variants?.find(
      (v) => v.size === selectedSize
    );

    const effectivePrice = Number(product.price) + Number(selectedVariant?.price_adjustment || 0);

    addItem({
      productId: product.id,
      name: product.name,
      price: effectivePrice,
      quantity: 1,
      imageUrl: product.product_images[0]?.image_url || "/placeholder.svg",
      size: selectedSize || undefined,
      variantId: selectedVariant?.id,
    });

    toast.success("Added to cart!");
  };

  const handleWishlistToggle = () => {
    if (!product) return;
    
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product.id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow pt-32 pb-20">
          <div className="container mx-auto px-4 text-center">
            <p className="text-muted-foreground">Loading product...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow pt-32 pb-20">
          <div className="container mx-auto px-4 text-center">
            <p className="text-muted-foreground">Product not found</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Images */}
            <div>
              <div
                className="aspect-[3/4] bg-muted overflow-hidden rounded-lg relative"
                role="img"
                aria-label={mainImage?.alt_text || product.name}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') goPrev();
                  if (e.key === 'ArrowRight') goNext();
                }}
              >
                {imgLoading && (
                  <div className="absolute inset-0 animate-pulse bg-muted/60" />
                )}
                <img
                  src={mainImage?.image_url || "/placeholder.svg"}
                  alt={mainImage?.alt_text || product.name}
                  className="w-full h-full object-contain cursor-zoom-in"
                  onLoad={() => setImgLoading(false)}
                  onClick={openLightbox}
                />
                {hasImages && (
                  <span className="absolute top-2 left-2 text-xs px-2 py-1 rounded bg-background/80 border">
                    {orderedImages.length} images
                  </span>
                )}
                {hasImages && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous image"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/70 border rounded-full w-9 h-9 flex items-center justify-center hover:bg-background"
                      onClick={goPrev}
                      disabled={activeImageIndex === 0}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      aria-label="Next image"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/70 border rounded-full w-9 h-9 flex items-center justify-center hover:bg-background"
                      onClick={goNext}
                      disabled={activeImageIndex === orderedImages.length - 1}
                    >
                      ›
                    </button>
                  </>
                )}
              </div>
              {hasImages && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {orderedImages.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      aria-label={`Show image ${idx + 1}`}
                      className={`border rounded-md p-0.5 ${idx === activeImageIndex ? "border-primary" : "border-border"}`}
                    >
                      <img
                        src={img.image_url}
                        alt={img.alt_text || `${product.name} ${idx + 1}`}
                        className="w-16 h-16 object-cover rounded"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="lg:py-12">
              <h1 className="text-4xl font-display mb-4">{product.name}</h1>
              <p className="text-2xl font-medium mb-8">
                {(() => {
                  const variant = product.product_variants?.find(v => v.size === selectedSize);
                  const price = Number(product.price) + Number(variant?.price_adjustment || 0);
                  return `${price.toLocaleString()} ETB`;
                })()}
              </p>
              
              <div className="prose prose-sm mb-8">
                <p className="text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Size Selection */}
              {product.product_variants && product.product_variants.length > 0 && (
                <div className="mb-8">
                  <label className="block text-sm font-medium mb-1 uppercase tracking-wider">
                    Select Size
                  </label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Choose a size to see the final price. Some sizes may slightly change the price.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.product_variants.map((variant) => (
                      <Button
                        key={variant.id}
                        variant={selectedSize === variant.size ? "default" : "outline"}
                        className="w-16 h-12"
                        onClick={() => setSelectedSize(variant.size || "")}
                        disabled={variant.stock === 0}
                      >
                        {variant.size}
                      </Button>
                    ))}
                  </div>
                  {!selectedSize && (
                    <p className="text-xs text-muted-foreground mt-2">Please select a size to enable Add to Cart.</p>
                  )}
                </div>
              )}

              {/* Add to Cart */}
              <div className="flex gap-3 mb-8">
                <Button size="lg" className="flex-1" onClick={handleAddToCart}>
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Add to Cart
                </Button>
                <Button 
                  size="lg" 
                  variant={isInWishlist(product.id) ? "default" : "outline"}
                  onClick={handleWishlistToggle}
                  className="px-6"
                >
                  <Heart className={`h-5 w-5 ${isInWishlist(product.id) ? "fill-current" : ""}`} />
                </Button>
              </div>

              {/* Product Details */}
              <div className="space-y-4 border-t border-border pt-8">
                {product.material && (
                  <div>
                    <h3 className="font-medium mb-2">Material</h3>
                    <p className="text-sm text-muted-foreground">{product.material}</p>
                  </div>
                )}
                {product.care_instructions && (
                  <div>
                    <h3 className="font-medium mb-2">Care Instructions</h3>
                    <p className="text-sm text-muted-foreground">{product.care_instructions}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onWheel={(e) => {
            if (e.deltaY < 0) zoomIn();
            else zoomOut();
          }}
        >
          <div className="flex items-center justify-between p-3 text-white">
            <span className="text-sm">{activeImageIndex + 1} / {orderedImages.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={zoomOut} disabled={zoom <= fitZoom}>-</Button>
              <Button variant="outline" size="sm" onClick={zoomIn} disabled={zoom >= maxZoom}>+</Button>
              <Button variant="outline" size="sm" onClick={closeLightbox}>Close</Button>
            </div>
          </div>
          <div
            className="relative flex-1 overflow-hidden"
            onMouseDown={(e) => { if (zoom > 1) { setDragging(true); setDragStart({x:e.clientX - pan.x, y:e.clientY - pan.y}); } }}
            onMouseMove={(e) => { if (dragging) setPan({x: e.clientX - dragStart.x, y: e.clientY - dragStart.y}); }}
            onMouseUp={() => setDragging(false)}
            onMouseLeave={() => setDragging(false)}
            onTouchStart={(e) => { setTouchStartX(e.touches[0].clientX); }}
            onTouchEnd={(e) => {
              if (touchStartX !== null) {
                const dx = (e.changedTouches[0].clientX - touchStartX);
                if (Math.abs(dx) > 40) {
                  if (dx < 0) goNext(); else goPrev();
                }
              }
              setTouchStartX(null);
            }}
          >
            {orderedImages[activeImageIndex] && (
              <img
                src={orderedImages[activeImageIndex].image_url}
                alt={orderedImages[activeImageIndex].alt_text || product?.name}
                className="absolute top-1/2 left-1/2 max-w-none"
                style={{ transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                draggable={false}
              />
            )}
            {/* Nav arrows in lightbox */}
            {hasImages && (
              <>
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white text-3xl disabled:opacity-40"
                  onClick={goPrev}
                  disabled={activeImageIndex === 0}
                >
                  ‹
                </button>
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-3xl disabled:opacity-40"
                  onClick={goNext}
                  disabled={activeImageIndex === orderedImages.length - 1}
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
