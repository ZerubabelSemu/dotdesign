import { Link } from "react-router-dom";
import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { Search } from "lucide-react";

const Shop = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { data: products, isLoading: productsLoading } = useProducts(selectedCategory);
  const { data: categories } = useCategories();

  // Filter products based on search query
  const filteredProducts = products?.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow pt-32 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-display mb-4">Our Collection</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover timeless pieces crafted with precision and passion. Each design tells a story of elegance and individuality.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-12">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-12 justify-center">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              className="uppercase tracking-wider text-xs"
              onClick={() => setSelectedCategory("all")}
            >
              All
            </Button>
            {categories?.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.slug ? "default" : "outline"}
                size="sm"
                className="uppercase tracking-wider text-xs"
                onClick={() => setSelectedCategory(category.slug)}
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Product Grid */}
          {productsLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="group"
                >
                  <div className="aspect-[3/4] overflow-hidden bg-muted mb-4">
                    <img
                      src={product.product_images[0]?.image_url || "/placeholder.svg"}
                      alt={product.product_images[0]?.alt_text || product.name}
                      className="w-full h-full object-cover elegant-transition group-hover:scale-105"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                      {product.category?.name}
                    </p>
                    <h3 className="font-display text-lg mb-2">{product.name}</h3>
                    <p className="font-medium">{Number(product.price).toLocaleString()} ETB</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? `No products found matching "${searchQuery}".` : "No products found in this category."}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Shop;
