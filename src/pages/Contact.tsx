import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { usePrimaryPhoneNumber, useMainShopLocation, usePickupHours } from "@/hooks/useShopInfo";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSocialLinks } from "@/hooks/useSocialLinks";
import { resolveSocialIcon } from "@/lib/socialIcons";

const Contact = () => {
  const { data: primaryPhone } = usePrimaryPhoneNumber();
  const { data: mainLocation } = useMainShopLocation();
  const { data: pickupHours } = usePickupHours(mainLocation?.id);
  const { data: socials } = useSocialLinks();

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<null | { ok: boolean; text: string }>(null);

  const formatHours = (hours: any[]) => {
    if (!hours || hours.length === 0) {
      return (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monday - Friday</span>
            <span className="font-medium">9:00 AM - 6:00 PM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Saturday</span>
            <span className="font-medium">10:00 AM - 4:00 PM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sunday</span>
            <span className="font-medium">Closed</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2 text-sm">
        {hours.map((hour) => (
          <div key={hour.day_of_week} className="flex justify-between">
            <span className="text-muted-foreground">{dayNames[hour.day_of_week]}</span>
            <span className="font-medium">
              {hour.is_closed 
                ? "Closed" 
                : `${hour.open_time} - ${hour.close_time}`
              }
            </span>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-display mb-4">Get in Touch</h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Have a question or interested in a custom design? We'd love to hear from you.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div>
                <form
                  className="space-y-6"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSubmitting(true);
                    setStatus(null);
                    try {
                      const payload = { name: name.trim(), email: email.trim(), phone: phone.trim() || null, message: message.trim() };
                      if (!payload.name || !payload.email || !payload.message) {
                        setStatus({ ok: false, text: "Please fill in name, email and message." });
                        setSubmitting(false);
                        return;
                      }
                      const { error } = await (supabase as any)
                        .from("contact_messages")
                        .insert([payload]);
                      if (error) throw error;
                      setStatus({ ok: true, text: "Thanks! Your message has been sent." });
                      setName(""); setEmail(""); setPhone(""); setMessage("");
                    } catch (err: any) {
                      setStatus({ ok: false, text: "Failed to send. Please try again." });
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Name
                    </label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your full name"
                      className="w-full"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      className="w-full"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium mb-2">
                      Phone (Optional)
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+251 XXX XXX XXX"
                      className="w-full"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-2">
                      Message
                    </label>
                    <Textarea
                      id="message"
                      rows={6}
                      placeholder="Tell us about your inquiry or custom design request..."
                      className="w-full resize-none"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  {status && (
                    <div className={`text-sm ${status.ok ? "text-green-600" : "text-red-600"}`}>{status.text}</div>
                  )}

                  <Button size="lg" className="w-full" disabled={submitting}>
                    {submitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </div>

              {/* Contact Info */}
              <div className="space-y-8">
                <div>
                  <h2 className="font-display text-2xl mb-6">Visit Our Atelier</h2>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <MapPin className="h-5 w-5 mt-1 text-accent flex-shrink-0" />
                      <div>
                        <p className="font-medium mb-1">Location</p>
                        <p className="text-sm text-muted-foreground">
                          {mainLocation ? (
                            <>
                              {mainLocation.address}<br />
                              {mainLocation.city}
                            </>
                          ) : (
                            <>
                              Addis Ababa, Ethiopia<br />
                              Bole Road, Near Mexican Square
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <Phone className="h-5 w-5 mt-1 text-accent flex-shrink-0" />
                      <div>
                        <p className="font-medium mb-1">Phone</p>
                        <p className="text-sm text-muted-foreground">
                          {primaryPhone?.phone_number || "+251 XXX XXX XXX"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <Mail className="h-5 w-5 mt-1 text-accent flex-shrink-0" />
                      <div>
                        <p className="font-medium mb-1">Email</p>
                        <p className="text-sm text-muted-foreground">
                          {mainLocation?.email || "info@dotdesign.et"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-display text-xl mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Business Hours
                  </h3>
                  {formatHours(pickupHours || [])}
                </div>

                <div>
                  <h3 className="font-display text-xl mb-4">Follow Us</h3>
                  <div className="flex space-x-2">
                    {(socials || []).map((s) => {
                      const { icon: Icon } = resolveSocialIcon(s.platform || s.url);
                      return (
                        <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="icon">
                            <Icon className="h-5 w-5" />
                          </Button>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
