import { useState, useRef, useEffect } from "react";
import { Package } from "lucide-react";
import { useStoreContext } from "@/context/store-context";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useItems } from "@/context/items-context";
import { categoryOptions } from "@/lib/categories";

type ItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
  defaultImage?: string;
};

export function ItemDialog({
  open,
  onOpenChange,
  defaultName,
  defaultImage,
}: ItemDialogProps) {

  const { addItem } = useItems();
  const { stores, addStore } = useStoreContext();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("other");
  const [preferredStoreId, setPreferredStoreId] = useState<number | undefined>();
  const [imageUrl, setImageUrl] = useState<string | undefined>();

  const [addingStore, setAddingStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const newStoreInputRef = useRef<HTMLInputElement>(null);

  // FIX 5: Reset all fields every time the dialog opens, then apply any
  // defaults passed in (e.g. from a barcode scan). This ensures that
  // opening the dialog a second time after a scan always starts fresh.
  useEffect(() => {
    if (open) {
      setName(defaultName ?? "");
      setNotes("");
      setImageUrl(defaultImage ?? undefined);
      setCategory("other");
      setPreferredStoreId(undefined);
      setAddingStore(false);
      setNewStoreName("");
    }
  }, [open, defaultName, defaultImage]);

  const handleSave = () => {
    if (!name.trim()) return;
    addItem(name, category, imageUrl, preferredStoreId, notes || undefined);
    onOpenChange(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const maxSize = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) { height *= maxSize / width; width = maxSize; }
        } else {
          if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        setImageUrl(canvas.toDataURL("image/jpeg", 0.7));
      };
    };

    reader.readAsDataURL(file);
  };

  function handleAddStore() {
    if (!newStoreName.trim()) return;
    const newId = addStore(newStoreName.trim());
    setPreferredStoreId(newId);
    setNewStoreName("");
    setAddingStore(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Add Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          <Input
            placeholder="Item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <textarea
            placeholder="Notes (optional) — e.g. brand, size, aisle..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {/* Category Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <select
              className="w-full border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categoryOptions.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Preferred Store Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Preferred Store</label>
            <select
              className="w-full border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={preferredStoreId ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "new") {
                  setAddingStore(true);
                  setTimeout(() => newStoreInputRef.current?.focus(), 50);
                  return;
                }
                setPreferredStoreId(value ? Number(value) : undefined);
              }}
            >
              <option value="">No preferred store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
              <option value="new">➕ Add new store</option>
            </select>

            {/* Inline Add Store */}
            {addingStore && (
              <div className="flex gap-2 pt-2">
                <input
                  ref={newStoreInputRef}
                  className="flex-1 border rounded-lg px-3 py-2 bg-background text-foreground"
                  placeholder="New store name..."
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddStore(); }}
                />
                <button
                  className="px-3 py-2 rounded-lg bg-primary text-white text-sm"
                  onClick={handleAddStore}
                >
                  Add
                </button>
                <button
                  className="px-3 py-2 rounded-lg border text-sm"
                  onClick={() => { setAddingStore(false); setNewStoreName(""); }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Item Image</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="text-sm"
              />
            </div>
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Preview"
                className="w-24 h-24 rounded-lg object-cover border"
              />
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full"
          >
            Save Item
          </Button>

        </div>
      </DialogContent>
    </Dialog>
  );
}