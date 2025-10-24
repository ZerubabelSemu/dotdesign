import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";


interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category_id: string | null;
  material: string | null;
  care_instructions: string | null;
  featured: boolean;
  published: boolean;
  product_sizes?: Array<{
    id: string;
    size: string;
    stock: number;
    price_adjustment: number;
    is_active: boolean;
  }>;
}

interface Category {
  id: string;
  name: string;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category_id: "",
    material: "",
    care_instructions: "",
    featured: false,
    published: true,
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [productImages, setProductImages] = useState<Array<{ id: string; image_url: string; alt_text: string | null; display_order: number }>>([]);
  const [productSizes, setProductSizes] = useState<Array<{
    size: string;
    stock: number;
    price_adjustment: number;
    is_active: boolean;
  }>>([]);
  const [hasSizes, setHasSizes] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    const loadImages = async () => {
      if (!editingProduct) { setProductImages([]); return; }
      const { data } = await supabase
        .from("product_images")
        .select("id, image_url, alt_text, display_order")
        .eq("product_id", editingProduct.id)
        .order("display_order", { ascending: true })
        .order("id", { ascending: true });
      setProductImages((data || []) as any);
    };
    loadImages();
  }, [editingProduct]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        product_variants(id, size, stock, price_adjustment)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch products",
      });
      return;
    }

    // Map product_variants into the component's expected product_sizes shape
    const mapped: Product[] = (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      stock: p.stock,
      category_id: p.category_id,
      material: p.material,
      care_instructions: p.care_instructions,
      featured: !!p.featured,
      published: !!p.published,
      product_sizes: (p.product_variants || []).map((v: any) => ({
        id: v.id,
        size: v.size,
        stock: v.stock,
        price_adjustment: v.price_adjustment ?? 0,
        is_active: (v.stock ?? 0) > 0,
      })),
    }));
    setProducts(mapped);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");

    setCategories(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const productData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      category_id: formData.category_id || null,
      material: formData.material || null,
      care_instructions: formData.care_instructions || null,
      featured: formData.featured,
      published: formData.published,
    };

    let productId: string | null = null;

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update product",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      productId = editingProduct.id;
    } else {
      const { data: created, error } = await supabase
        .from("products")
        .insert([productData])
        .select()
        .single();

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create product",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Product created successfully",
      });
      productId = created?.id as string;
    }

    // Handle image uploads if any
    if (productId && imageFiles.length > 0) {
      for (const file of imageFiles) {
        const path = `${productId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, file, { upsert: false });
        if (uploadError) {
          toast({ variant: "destructive", title: "Image upload failed", description: uploadError.message });
          continue;
        }
        const { data: pub } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);
        const { data: inserted } = await supabase
          .from("product_images")
          .insert({
            product_id: productId,
            image_url: pub.publicUrl,
            alt_text: file.name,
            display_order: 0,
          })
          .select()
          .single();
        if (inserted) {
          setProductImages((prev) => [...prev, inserted as any]);
        }
      }
      toast({ title: "Images uploaded", description: "Product images updated." });
    }

    // Handle product sizes if any
    if (productId && hasSizes && productSizes.length > 0) {
      // Delete existing variants for this product
      await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", productId);

      // Insert new variants (no is_active column in DB). If inactive, set stock to 0.
      const sizesToInsert = productSizes.map(size => ({
        product_id: productId,
        size: size.size,
        stock: size.is_active ? size.stock : 0,
        price_adjustment: size.price_adjustment,
      }));

      const { error: sizesError } = await supabase
        .from("product_variants")
        .insert(sizesToInsert);

      if (sizesError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save product sizes",
        });
      } else {
        toast({ title: "Sizes saved", description: "Product sizes updated." });
      }
    }

    setIsDialogOpen(false);
    resetForm();
    fetchProducts();
  };

  const removeProductImage = async (imgId: string, imageUrl: string) => {
    // Try to derive storage path from public URL
    try {
      const marker = "/storage/v1/object/public/product-images/";
      const idx = imageUrl.indexOf(marker);
      if (idx !== -1) {
        const path = imageUrl.substring(idx + marker.length);
        await supabase.storage.from("product-images").remove([path]);
      }
    } catch {}
    await supabase.from("product_images").delete().eq("id", imgId);
    setProductImages((prev) => prev.filter((p) => p.id !== imgId));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    setProductImages((prev) => {
      const arr = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= arr.length) return prev;
      const tmp = arr[index];
      arr[index] = arr[newIndex];
      arr[newIndex] = tmp;
      return arr.map((img, i) => ({ ...img, display_order: i }));
    });
  };

  const saveImageOrdering = async () => {
    if (!editingProduct) return;
    try {
      for (const img of productImages) {
        await supabase
          .from("product_images")
          .update({ display_order: img.display_order, alt_text: img.alt_text })
          .eq("id", img.id);
      }
      toast({ title: "Images saved", description: "Ordering and details updated." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save image ordering" });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      stock: product.stock.toString(),
      category_id: product.category_id || "",
      material: product.material || "",
      care_instructions: product.care_instructions || "",
      featured: product.featured,
      published: product.published,
    });
    
    // Set sizes if they exist
    if (product.product_sizes && product.product_sizes.length > 0) {
      setHasSizes(true);
      setProductSizes(product.product_sizes.map(size => ({
        size: size.size,
        stock: size.stock,
        price_adjustment: size.price_adjustment,
        is_active: size.is_active,
      })));
    } else {
      setHasSizes(false);
      setProductSizes([]);
    }
    
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete product",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Product deleted successfully",
    });

    fetchProducts();
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      stock: "",
      category_id: "",
      material: "",
      care_instructions: "",
      featured: false,
      published: true,
    });
    setImageFiles([]);
    setProductSizes([]);
    setHasSizes(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-4xl font-display mb-2">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Input
              placeholder="Search products…"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="md:w-80"
            />
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-5 w-5 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name*</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="images">Images</Label>
                  <Input
                    id="images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">You can select multiple images. They will be uploaded after you {editingProduct ? "update" : "create"} the product.</p>
                  {imageFiles.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-2">New files (to be uploaded on save):</p>
                      <div className="flex flex-wrap gap-2">
                        {imageFiles.map((file, i) => (
                          <div key={i} className="w-20 h-20 border rounded overflow-hidden">
                            <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setImageFiles([])}>Clear New Images</Button>
                    </div>
                  )}
                  {editingProduct && (
                    <div className="mt-4">
                      <Label>Existing Images</Label>
                      {productImages.length === 0 ? (
                        <p className="text-xs text-muted-foreground mt-1">No images yet.</p>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {productImages.map((img, idx) => (
                            <div key={img.id} className="flex items-center gap-3 p-2 border rounded">
                              <div className="w-16 h-16 rounded overflow-hidden">
                                <img src={img.image_url} alt={img.alt_text || ""} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1">
                                <Input
                                  value={img.alt_text || ""}
                                  placeholder="Alt text (optional)"
                                  onChange={(e) => setProductImages((prev) => prev.map((p, i) => i === idx ? { ...p, alt_text: e.target.value } : p))}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => moveImage(idx, -1)} disabled={idx === 0}>Up</Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => moveImage(idx, 1)} disabled={idx === productImages.length - 1}>Down</Button>
                                <Button type="button" variant="destructive" size="sm" onClick={() => removeProductImage(img.id, img.image_url)}>Remove</Button>
                              </div>
                            </div>
                          ))}
                          <div className="pt-1">
                            <Button type="button" variant="outline" size="sm" onClick={saveImageOrdering}>Save Images</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price (ETB)*</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="stock">Stock*</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="material">Material</Label>
                  <Input
                    id="material"
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="care">Care Instructions</Label>
                  <Textarea
                    id="care"
                    value={formData.care_instructions}
                    onChange={(e) => setFormData({ ...formData, care_instructions: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Label htmlFor="has-sizes">Product Has Sizes</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable if this product comes in different sizes (S, M, L, XL, etc.)
                      </p>
                    </div>
                    <Switch
                      id="has-sizes"
                      checked={hasSizes}
                      onCheckedChange={(checked) => {
                        setHasSizes(checked);
                        if (!checked) {
                          setProductSizes([]);
                        } else if (productSizes.length === 0) {
                          // Initialize with default sizes
                          setProductSizes([
                            { size: "S", stock: 0, price_adjustment: 0, is_active: true },
                            { size: "M", stock: 0, price_adjustment: 0, is_active: true },
                            { size: "L", stock: 0, price_adjustment: 0, is_active: true },
                            { size: "XL", stock: 0, price_adjustment: 0, is_active: true },
                          ]);
                        }
                      }}
                    />
                  </div>

                  {hasSizes && (
                    <div className="space-y-3">
                      <Label>Product Sizes</Label>
                      <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground px-1">
                        <span>Size</span>
                        <span>Stock</span>
                        <span>Price Adjustment (ETB)</span>
                        <span>Active</span>
                      </div>
                      {productSizes.map((size, index) => (
                        <div key={index} className="grid grid-cols-4 gap-2 items-center p-3 border rounded-lg">
                          <div>
                            <Input
                              placeholder="e.g., S, M, L, XL"
                              value={size.size}
                              onChange={(e) => {
                                const newSizes = [...productSizes];
                                newSizes[index] = { ...size, size: e.target.value };
                                setProductSizes(newSizes);
                              }}
                            />
                          </div>
                          <div>
                            <Input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={Number.isFinite(size.stock) ? size.stock : 0}
                              onChange={(e) => {
                                const val = e.target.value;
                                const parsed = val === "" ? 0 : parseInt(val, 10);
                                const newSizes = [...productSizes];
                                newSizes[index] = { ...size, stock: Number.isFinite(parsed) ? parsed : 0 };
                                setProductSizes(newSizes);
                              }}
                            />
                          </div>
                          <div>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00 (can be negative)"
                              value={Number.isFinite(size.price_adjustment) ? size.price_adjustment : 0}
                              onChange={(e) => {
                                const val = e.target.value;
                                const parsed = val === "" ? 0 : parseFloat(val);
                                const newSizes = [...productSizes];
                                newSizes[index] = { ...size, price_adjustment: Number.isFinite(parsed) ? parsed : 0 };
                                setProductSizes(newSizes);
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={size.is_active}
                              onCheckedChange={(checked) => {
                                const newSizes = [...productSizes];
                                newSizes[index] = { ...size, is_active: checked };
                                setProductSizes(newSizes);
                              }}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                const newSizes = productSizes.filter((_, i) => i !== index);
                                setProductSizes(newSizes);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProductSizes([...productSizes, { size: "", stock: 0, price_adjustment: 0, is_active: true }]);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Size
                      </Button>
                    </div>
                  )}
                </div>

                {/* Flags */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      className="rounded"
                    />
                    <span>Featured</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.published}
                      onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                      className="rounded"
                    />
                    <span>Published</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingProduct ? "Update" : "Create"} Product
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
        </div>

        {(() => {
          const q = productSearch.trim().toLowerCase();
          const filtered = q
            ? products.filter(p =>
                (p.name || "").toLowerCase().includes(q) ||
                (p.description || "").toLowerCase().includes(q)
              )
            : products;
          return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => (
            <Card key={product.id} className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-lg mb-1">{product.name}</h3>
                  <p className="text-2xl font-bold">{product.price.toLocaleString()} ETB</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Stock: {product.stock}
                  </p>
                  {product.product_sizes && product.product_sizes.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Available Sizes:</p>
                      <div className="flex flex-wrap gap-1">
                        {product.product_sizes.filter(size => size.is_active).map((size) => (
                          <span key={size.id} className="px-2 py-1 bg-muted text-xs rounded">
                            {size.size} ({size.stock})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
          );
        })()}

        {products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products yet. Create your first product!</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Products;