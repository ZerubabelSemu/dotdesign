import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroMain from "@/assets/hero-main.jpg";
import { useFeaturedProducts } from "@/hooks/useProducts";

const Index = () => {
  const { data: featuredProducts } = useFeaturedProducts();

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative h-screen">
        <div className="absolute inset-0">
          <img
            src={heroMain}
            alt="Dot Design Fashion"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        </div>
        
        <div className="relative h-full flex items-center justify-center text-center px-4">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-display text-primary-foreground mb-6 animate-fade-in">
              Elegance Redefined
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 animate-fade-in">
              Ethiopian fashion crafted with passion, designed for timeless expression
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
              <Link to="/shop">
                <Button size="lg" variant="secondary" className="group">
                  Explore Collection
                  <ArrowRight className="ml-2 h-5 w-5 elegant-transition group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="outline" className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                  Our Story
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collection */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display mb-4">Featured Collection</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover our carefully curated selection of signature pieces, each telling its own story of elegance and craftsmanship.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {featuredProducts?.map((product) => (
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
                  <h3 className="font-display text-lg mb-2">{product.name}</h3>
                  <p className="text-muted-foreground">{Number(product.price).toLocaleString()} ETB</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/shop">
              <Button variant="outline" size="lg" className="group">
                View All Products
                <ArrowRight className="ml-2 h-5 w-5 elegant-transition group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="py-24 bg-muted">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-display mb-6">
              Where Heritage Meets Innovation
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Born in Addis Ababa, Dot Design celebrates Ethiopian artistry through contemporary fashion. Each piece is thoughtfully crafted to honor our rich textile heritage while embracing modern design sensibilities.
            </p>
            <Link to="/about">
              <Button variant="default" size="lg">
                Discover Our Story
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-accent">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display mb-6">
            Custom Design Services
          </h2>
          <p className="text-accent-foreground/80 max-w-2xl mx-auto mb-8">
            Looking for something unique? Our atelier offers bespoke design services tailored to your vision. From initial consultation to final fitting, we bring your dream pieces to life.
          </p>
          <Link to="/contact">
            <Button variant="default" size="lg">
              Book a Consultation
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
