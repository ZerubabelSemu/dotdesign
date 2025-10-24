import { Link } from "react-router-dom";
import { useState } from "react";
import { Mail, MapPin, Phone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePhoneNumbers, useShopLocations } from "@/hooks/useShopInfo";
import { useSocialLinks } from "@/hooks/useSocialLinks";
import { resolveSocialIcon } from "@/lib/socialIcons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Footer = () => {
  const { data: phoneNumbers } = usePhoneNumbers();
  const { data: locations } = useShopLocations();
  const { data: socials } = useSocialLinks();
  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const openMapsUrls = (lat?: number | null, lng?: number | null, address?: string) => {
    const enc = encodeURIComponent(address || "");
    const q = lat != null && lng != null ? `${lat},${lng}` : enc;
    const google = `https://www.google.com/maps?q=${q}`;
    const apple = `https://maps.apple.com/?q=${q}`;
    return { google, apple };
  };

  const subscribe = async () => {
    const email = newsletterEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ variant: "destructive", title: "Invalid email", description: "Please enter a valid email address." });
      return;
    }
    try {
      setSubmitting(true);
      const { error } = await (supabase as any)
        .from("newsletter_subscribers")
        .insert([{ email }]);
      if (error) throw error;
      toast({ title: "Subscribed", description: "You've been added to our newsletter." });
      setNewsletterEmail("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Subscription failed", description: e.message || "Try again later." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* About */}
          <div>
            <h3 className="font-display text-lg mb-4">Dot Design</h3>
            <p className="text-sm text-primary-foreground/80 leading-relaxed">
              Empowering creativity and style through high-quality fashion pieces tailored to individual expression.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { name: "Shop", path: "/shop" },
                { name: "About", path: "/about" },
                { name: "Contact", path: "/contact" },
              ].map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-primary-foreground/80 hover:text-accent elegant-transition"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-display text-lg mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2 text-sm text-primary-foreground/80">
                <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                <button className="text-left underline underline-offset-2 hover:text-accent elegant-transition" onClick={() => setLocDialogOpen(true)}>
                  {locations && locations.length > 0 ? (
                    <div className="not-italic no-underline space-y-3">
                      {(locations || [])
                        .filter(l => l.is_active)
                        .slice()
                        .sort((a, b) => {
                          const aKey = (a.name?.trim() || a.address || "").toLowerCase();
                          const bKey = (b.name?.trim() || b.address || "").toLowerCase();
                          return aKey.localeCompare(bKey);
                        })
                        .map((l) => (
                        <div key={l.id}>
                          <div className="font-medium">{(l.name && l.name.trim()) || l.address}</div>
                          <div>{[l.address, l.city].filter(Boolean).join(', ')}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    "View locations"
                  )}
                </button>
              </li>
              <li className="flex flex-col space-y-1 text-sm text-primary-foreground/80">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>Phone</span>
                </div>
                <div className="ml-6 space-y-1">
                  {(phoneNumbers || []).filter(p => p.is_active).map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <a
                        href={`tel:${(p.phone_number || '').replace(/\s+/g, '')}`}
                        className="underline underline-offset-2 hover:text-accent"
                      >
                        {p.phone_number}
                      </a>
                      {p.is_primary && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/20">Primary</span>
                      )}
                    </div>
                  ))}
                </div>
              </li>
              <li className="flex items-start space-x-2 text-sm text-primary-foreground/80">
                <Mail className="h-4 w-4 mt-1 flex-shrink-0" />
                <div className="space-y-1">
                  {(() => {
                    const emails = (locations || [])
                      .filter(l => l.is_active && l.email)
                      .map(l => l.email as string);
                    if (emails.length === 0) {
                      return <span>info@dotdesign.et</span>;
                    }
                    return emails.map((em, idx) => (
                      <div key={`${em}-${idx}`}>
                        <a href={`mailto:${em}`} className="underline underline-offset-2 hover:text-accent">{em}</a>
                      </div>
                    ));
                  })()}
                </div>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-display text-lg mb-4">Newsletter</h3>
            <p className="text-sm text-primary-foreground/80 mb-4">
              Subscribe to receive updates, access to exclusive deals, and more.
            </p>
            <div className="flex flex-col space-y-2">
              <Input
                type="email"
                placeholder="Your email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
              />
              <Button variant="secondary" size="sm" className="w-full" disabled={submitting} onClick={subscribe}>
                {submitting ? "Subscribing..." : "Subscribe"}
              </Button>
            </div>
          </div>
        </div>

        {/* Social & Copyright */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex space-x-2">
            {(socials || []).map((s) => {
              const { icon: Icon, label } = resolveSocialIcon(s.platform || s.url);
              return (
                <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <Button variant="ghost" size="icon" className="hover:bg-primary-foreground/10">
                    <Icon className="h-5 w-5" />
                  </Button>
                </a>
              );
            })}
          </div>
          <p className="text-sm text-primary-foreground/60">
            © {new Date().getFullYear()} Dot Design. All rights reserved.
          </p>
        </div>

        <Dialog open={locDialogOpen} onOpenChange={setLocDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Our Locations</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {(locations || []).filter(l => l.is_active).map((l) => {
                const maps = openMapsUrls(l.latitude as any, l.longitude as any, `${l.address}, ${l.city}`);
                return (
                  <div key={l.id} className="p-3 rounded-lg border">
                    <div className="font-medium mb-1">{l.name}</div>
                    <div className="text-sm text-muted-foreground mb-2">{l.address}, {l.city}</div>
                    <div className="flex gap-2">
                      <a href={maps.google} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Google Maps
                        </Button>
                      </a>
                      <a href={maps.apple} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Apple Maps
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })}
              {(locations || []).filter(l => l.is_active).length === 0 && (
                <div className="text-sm text-muted-foreground">No active locations available.</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </footer>
  );
};

export default Footer;
