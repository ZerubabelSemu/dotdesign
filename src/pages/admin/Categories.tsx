import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  slug: string;
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();
  const [categorySearch, setCategorySearch] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: "",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch categories",
      });
      return;
    }

    setCategories(data || []);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const categoryData = {
      name: formData.name,
      description: formData.description || null,
      slug: formData.slug || generateSlug(formData.name),
    };

    if (editingCategory) {
      const { error } = await supabase
        .from("categories")
        .update(categoryData)
        .eq("id", editingCategory.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update category",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    } else {
      const { error } = await supabase
        .from("categories")
        .insert([categoryData]);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create category",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Category created successfully",
      });
    }

    setIsDialogOpen(false);
    resetForm();
    fetchCategories();
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      slug: category.slug,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will affect all products in this category.")) return;

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete category",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Category deleted successfully",
    });

    fetchCategories();
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      slug: "",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-4xl font-display mb-2">Categories</h1>
            <p className="text-muted-foreground">Organize your products</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Input
              placeholder="Search categories…"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="md:w-80"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div />
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-5 w-5 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Edit Category" : "Add New Category"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Category Name*</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData({ 
                        ...formData, 
                        name,
                        slug: generateSlug(name)
                      });
                    }}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="slug">Slug*</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used in URLs (e.g., /shop/dresses)
                  </p>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingCategory ? "Update" : "Create"} Category
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

        {(() => {
          const q = categorySearch.trim().toLowerCase();
          const filtered = q
            ? categories.filter(c =>
                (c.name || "").toLowerCase().includes(q) ||
                (c.slug || "").toLowerCase().includes(q) ||
                (c.description || "").toLowerCase().includes(q)
              )
            : categories;
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((category) => (
                <Card key={category.id} className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-display text-lg mb-1">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">/{category.slug}</p>
                    </div>

                    {category.description && (
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
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

        {categories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No categories yet. Create your first category!</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Categories;