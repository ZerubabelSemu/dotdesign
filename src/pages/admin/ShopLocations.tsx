import { useEffect, useRef, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, MapPin, Clock } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// Fix default marker icons in Vite
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

interface ShopLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

interface PickupHour {
  id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

const ShopLocations = () => {
  const [locations, setLocations] = useState<ShopLocation[]>([]);
  const [pickupHours, setPickupHours] = useState<PickupHour[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ShopLocation | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<ShopLocation | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    latitude: "",
    longitude: "",
    phone: "",
    email: "",
    is_active: true,
  });
  const [hoursData, setHoursData] = useState<PickupHour[]>([]);
  const { toast } = useToast();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (isDialogOpen) {
      setTimeout(() => {
        if (!mapContainerRef.current) return;
        if (!mapRef.current) {
          const center: L.LatLngExpression = [
            formData.latitude ? parseFloat(formData.latitude) : 9.0054,
            formData.longitude ? parseFloat(formData.longitude) : 38.7636,
          ];
          const map = L.map(mapContainerRef.current).setView(center, 13);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors",
          }).addTo(map);
          map.on("click", (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng;
            if (markerRef.current) {
              markerRef.current.setLatLng([lat, lng]);
            } else {
              markerRef.current = L.marker([lat, lng]).addTo(map);
            }
            setFormData((prev) => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
          });
          mapRef.current = map;
          if (formData.latitude && formData.longitude) {
            markerRef.current = L.marker([parseFloat(formData.latitude), parseFloat(formData.longitude)]).addTo(map);
          }
        } else {
          const map = mapRef.current;
          if (map) {
            const lat = formData.latitude ? parseFloat(formData.latitude) : 9.0054;
            const lng = formData.longitude ? parseFloat(formData.longitude) : 38.7636;
            map.setView([lat, lng], 13);
            if (markerRef.current) {
              markerRef.current.setLatLng([lat, lng]);
            } else {
              markerRef.current = L.marker([lat, lng]).addTo(map);
            }
          }
        }
      }, 0);
    } else {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    }
  }, [isDialogOpen]);

  const fetchLocations = async () => {
    const { data, error } = await (supabase as any)
      .from("shop_locations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch shop locations",
      });
      return;
    }

    setLocations(Array.isArray(data) ? (data as any as ShopLocation[]) : []);
  };

  const fetchPickupHours = async (locationId: string) => {
    const { data, error } = await (supabase as any)
      .from("pickup_hours")
      .select("*")
      .eq("location_id", locationId)
      .order("day_of_week");

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch pickup hours",
      });
      return;
    }

    setPickupHours(Array.isArray(data) ? (data as any as PickupHour[]) : []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const locationData = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        phone: formData.phone || null,
        email: formData.email || null,
      };

      if (editingLocation) {
        const { error } = await (supabase as any)
          .from("shop_locations")
          .update(locationData)
          .eq("id", editingLocation.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Shop location updated successfully",
        });
      } else {
        const { data, error } = await (supabase as any)
          .from("shop_locations")
          .insert([locationData])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Success",
          description: "Shop location added successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchLocations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleHoursSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLocation) return;

    try {
      // Delete existing hours
      await (supabase as any)
        .from("pickup_hours")
        .delete()
        .eq("location_id", selectedLocation.id);

      // Insert new hours
      const hoursToInsert = hoursData.map(hour => ({
        location_id: selectedLocation.id,
        day_of_week: hour.day_of_week,
        open_time: hour.open_time,
        close_time: hour.close_time,
        is_closed: hour.is_closed,
      }));

      const { error } = await (supabase as any)
        .from("pickup_hours")
        .insert(hoursToInsert);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Pickup hours updated successfully",
      });

      setIsHoursDialogOpen(false);
      fetchPickupHours(selectedLocation.id);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleEdit = (location: ShopLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address,
      city: location.city,
      latitude: location.latitude?.toString() || "",
      longitude: location.longitude?.toString() || "",
      phone: location.phone || "",
      email: location.email || "",
      is_active: location.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleEditHours = (location: ShopLocation) => {
    setSelectedLocation(location);
    fetchPickupHours(location.id);
    setIsHoursDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shop location?")) return;

    const { error } = await (supabase as any)
      .from("shop_locations")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete shop location",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Shop location deleted successfully",
    });

    fetchLocations();
  };

  const resetForm = () => {
    setEditingLocation(null);
    setFormData({
      name: "",
      address: "",
      city: "",
      latitude: "",
      longitude: "",
      phone: "",
      email: "",
      is_active: true,
    });
  };

  const initializeHoursData = () => {
    if (pickupHours.length > 0) {
      setHoursData(pickupHours);
    } else {
      // Initialize with default hours
      const defaultHours = Array.from({ length: 7 }, (_, i) => ({
        id: `temp-${i}`,
        day_of_week: i,
        open_time: i === 0 ? null : "09:00", // Sunday closed
        close_time: i === 0 ? null : "18:00", // Sunday closed
        is_closed: i === 0, // Sunday closed
      }));
      setHoursData(defaultHours);
    }
  };

  useEffect(() => {
    if (isHoursDialogOpen && selectedLocation) {
      initializeHoursData();
    }
  }, [isHoursDialogOpen, selectedLocation, pickupHours]);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display mb-2">Shop Locations</h1>
            <p className="text-muted-foreground">Manage store locations and pickup hours</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-5 w-5 mr-2" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingLocation ? "Edit Shop Location" : "Add New Shop Location"}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Location Name*</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Main Store, Branch Office, etc."
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address*</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Fashion Street"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="city">City*</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Addis Ababa"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="9.0054"
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="38.7636"
                    />
                  </div>
                </div>

                <div>
                  <Label>Pick on Map</Label>
                  <div ref={mapContainerRef} className="mt-2 h-64 w-full rounded-md border" />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+251 926 765 309"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@dotdesign.com"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_active">Active</Label>
                    <p className="text-sm text-muted-foreground">
                      Show this location to customers
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingLocation ? "Update" : "Add"} Location
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {locations.map((location) => (
            <Card key={location.id} className="p-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {location.name}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditHours(location)}
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(location)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(location.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{location.address}</p>
                  <p className="text-muted-foreground">{location.city}</p>
                  {location.phone && <p className="text-sm">📞 {location.phone}</p>}
                  {location.email && <p className="text-sm">✉️ {location.email}</p>}
                  {location.latitude && location.longitude && (
                    <p className="text-sm text-muted-foreground">
                      📍 {location.latitude}, {location.longitude}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    {location.is_active ? (
                      <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-500/10 text-gray-500 text-xs rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {locations.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No shop locations yet. Add your first location!</p>
          </div>
        )}
      </div>

      {/* Pickup Hours Dialog */}
      <Dialog open={isHoursDialogOpen} onOpenChange={setIsHoursDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pickup Hours - {selectedLocation?.name}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleHoursSubmit} className="space-y-4">
            {hoursData.map((hour, index) => (
              <div key={hour.day_of_week} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="w-24">
                  <Label className="font-medium">{dayNames[hour.day_of_week]}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!hour.is_closed}
                    onCheckedChange={(checked) => {
                      const newHours = [...hoursData];
                      newHours[index] = {
                        ...hour,
                        is_closed: !checked,
                        open_time: checked ? "09:00" : null,
                        close_time: checked ? "18:00" : null,
                      };
                      setHoursData(newHours);
                    }}
                  />
                </div>
                {!hour.is_closed && (
                  <>
                    <div className="flex items-center gap-2">
                      <Label>From:</Label>
                      <Input
                        type="time"
                        value={hour.open_time || ""}
                        onChange={(e) => {
                          const newHours = [...hoursData];
                          newHours[index] = { ...hour, open_time: e.target.value };
                          setHoursData(newHours);
                        }}
                        className="w-32"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>To:</Label>
                      <Input
                        type="time"
                        value={hour.close_time || ""}
                        onChange={(e) => {
                          const newHours = [...hoursData];
                          newHours[index] = { ...hour, close_time: e.target.value };
                          setHoursData(newHours);
                        }}
                        className="w-32"
                      />
                    </div>
                  </>
                )}
              </div>
            ))}

            <div className="flex gap-2">
              <Button type="submit">Update Hours</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsHoursDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ShopLocations;
