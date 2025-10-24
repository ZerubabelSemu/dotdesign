import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import aboutHero from "@/assets/about-hero.jpg";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow pt-20">
        {/* Hero Image */}
        <div className="h-[60vh] overflow-hidden">
          <img
            src={aboutHero}
            alt="Dot Design Atelier"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Story Section */}
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-display mb-8 text-center">
              The Story of Dot Design
            </h1>
            
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>
                Founded in the heart of Addis Ababa, Dot Design represents the perfect fusion of Ethiopian heritage and contemporary fashion. Our journey began with a simple belief: that clothing should be more than just fabric—it should be an expression of individuality, culture, and artistry.
              </p>
              
              <p>
                Each piece in our collection is thoughtfully designed and meticulously crafted, celebrating the rich textile traditions of Ethiopia while embracing modern silhouettes and innovative design techniques. We work with skilled artisans who bring decades of expertise to every stitch, ensuring that quality and attention to detail remain at the heart of everything we create.
              </p>
              
              <p>
                Our philosophy is simple: create timeless pieces that empower the wearer. We believe in slow fashion—in garments that last, that tell stories, and that become cherished parts of our customers' wardrobes. From the initial sketch to the final fitting, every step of our process is guided by a commitment to excellence and sustainability.
              </p>
              
              <p>
                At Dot Design, we're not just creating clothes; we're crafting experiences. We're building a community of individuals who appreciate the artistry of fashion and understand that true style is timeless. Join us on this journey as we continue to push boundaries, celebrate craftsmanship, and redefine what Ethiopian fashion can be.
              </p>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="bg-muted py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-display mb-12 text-center">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
              <div className="text-center">
                <h3 className="font-display text-xl mb-4">Craftsmanship</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every piece is created with meticulous attention to detail, honoring traditional techniques while embracing innovation.
                </p>
              </div>
              <div className="text-center">
                <h3 className="font-display text-xl mb-4">Sustainability</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We're committed to ethical practices, from sourcing materials to fair treatment of our artisans and minimal environmental impact.
                </p>
              </div>
              <div className="text-center">
                <h3 className="font-display text-xl mb-4">Individuality</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We celebrate unique style and self-expression, creating pieces that empower you to tell your own story.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
