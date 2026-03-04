import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertItemSchema, type Item, type InsertItem } from "@shared/schema";
import { useCreateItem, useUpdateItem } from "@/hooks/use-items";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2, Camera, X } from "lucide-react";

const PRESET_CATEGORIES = [
  "Produce",
  "Dairy & Eggs",
  "Meat & Seafood",
  "Bakery",
  "Frozen",
  "Beverages",
  "Snacks",
  "Pantry & Dry Goods",
  "Household",
  "Personal Care",
];

interface ItemDialogProps {
  item?: Item;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ItemDialog({ item, trigger, open, onOpenChange }: ItemDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [categoryMode, setCategoryMode] = useState<string>("");
  const [customCategory, setCustomCategory] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem();

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEditing = !!item;

  const form = useForm<InsertItem>({
    resolver: zodResolver(insertItemSchema),
    defaultValues: {
      name: "",
      category: "",
      notes: "",
      imageUrl: "",
      quantity: 1,
      inShoppingList: false,
    },
  });

  const imageUrl = form.watch("imageUrl");

  const initCategoryState = (categoryValue: string | null | undefined) => {
    const val = categoryValue || "";
    if (!val) {
      setCategoryMode("");
      setCustomCategory("");
    } else if (PRESET_CATEGORIES.includes(val)) {
      setCategoryMode(val);
      setCustomCategory("");
    } else {
      setCategoryMode("custom");
      setCustomCategory(val);
    }
  };

  useEffect(() => {
    if (dialogOpen) {
      if (item) {
        form.reset({
          name: item.name,
          category: item.category || "",
          notes: item.notes || "",
          imageUrl: item.imageUrl || "",
          quantity: item.quantity || 1,
          inShoppingList: item.inShoppingList,
        });
        initCategoryState(item.category);
      } else {
        form.reset({
          name: "",
          category: "",
          notes: "",
          imageUrl: "",
          quantity: 1,
          inShoppingList: false,
        });
        setCategoryMode("");
        setCustomCategory("");
      }
    }
  }, [dialogOpen, item, form]);

  const handleCategorySelect = (value: string) => {
    setCategoryMode(value);
    if (value === "custom") {
      form.setValue("category", customCategory);
    } else {
      form.setValue("category", value);
      setCustomCategory("");
    }
  };

  const handleCustomCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomCategory(e.target.value);
    form.setValue("category", e.target.value);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      form.setValue("imageUrl", data.imageUrl);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    form.setValue("imageUrl", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: InsertItem) => {
    if (isEditing && item) {
      await updateMutation.mutateAsync({ id: item.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="hover-lift">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[500px] border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEditing ? "Edit Item" : "Create New Item"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details of your item below."
              : "Add a new item to your database to use in shopping lists."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                data-testid="input-name"
                placeholder="e.g. Organic Avocados"
                {...form.register("name")}
                className="bg-secondary/50 border-transparent focus-visible:border-primary focus-visible:bg-background transition-colors"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={categoryMode} onValueChange={handleCategorySelect}>
                <SelectTrigger
                  id="category"
                  data-testid="select-category"
                  className="bg-secondary/50 border-transparent focus:border-primary focus:bg-background transition-colors h-10"
                >
                  <SelectValue placeholder="Select a category..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50 shadow-xl">
                  {PRESET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                  <SelectItem value="custom">Custom...</SelectItem>
                </SelectContent>
              </Select>

              {categoryMode === "custom" && (
                <Input
                  data-testid="input-custom-category"
                  placeholder="Enter your category"
                  value={customCategory}
                  onChange={handleCustomCategoryChange}
                  autoFocus
                  className="bg-secondary/50 border-transparent focus-visible:border-primary focus-visible:bg-background transition-colors mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                data-testid="input-quantity"
                type="number"
                min={1}
                placeholder="1"
                {...form.register("quantity", { valueAsNumber: true })}
                className="bg-secondary/50 border-transparent focus-visible:border-primary focus-visible:bg-background transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                data-testid="input-notes"
                placeholder="Brand preferences, aisles, or quantity..."
                {...form.register("notes")}
                className="resize-none min-h-[100px] bg-secondary/50 border-transparent focus-visible:border-primary focus-visible:bg-background transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label>Item Photo</Label>
              <div className="flex flex-col gap-4">
                {imageUrl ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-border/50 group/image">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={removeImage}
                        className="rounded-full"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove Photo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video rounded-xl border-2 border-dashed border-border/50 bg-secondary/30 flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50 hover:border-primary/50 transition-all group"
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                          <Camera className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm font-medium">Click to upload or take a photo</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                      </>
                    )}
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/30">
              <div className="space-y-0.5">
                <Label htmlFor="inShoppingList" className="text-base">Add to Shopping List</Label>
                <p className="text-sm text-muted-foreground">
                  Include this item in your active shopping list right away.
                </p>
              </div>
              <Switch
                id="inShoppingList"
                data-testid="switch-inShoppingList"
                checked={form.watch("inShoppingList")}
                onCheckedChange={(checked) => form.setValue("inShoppingList", checked)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="hover-lift min-w-[120px]" data-testid="button-submit">
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Item"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
