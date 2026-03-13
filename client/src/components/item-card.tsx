import { Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useItems } from "@/context/items-context";
import { useStoreContext } from "@/context/store-context";
import { useAuth } from "@/hooks/use-auth";
import { useState, useRef } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

const categoryLabels: Record<string, string> = {
  produce:    "🥦 Produce",
  bakery:     "🍞 Bakery",
  meat:       "🥩 Meat",
  dairy:      "🥛 Dairy",
  chilled:    "🧊 Chilled",
  frozen:     "❄ Frozen",
  pantry:     "🥫 Pantry",
  beverages:  "🍾 Beverages",
  household:  "🧴 Household",
  other:      "📦 Other"
};

const categoryIcons: Record<string, string> = {
  produce:    "🥦",
  bakery:     "🍞",
  meat:       "🥩",
  dairy:      "🥛",
  chilled:    "🧊",
  frozen:     "❄️",
  pantry:     "🥫",
  beverages:  "🍾",
  household:  "🧴",
  other:      "📦"
};

type Item = {
  id: number;
  name: string;
  category?: string;
  imageUrl?: string;
  preferredStoreId?: number;
};

export function ItemCard({ item }: { item: Item }) {
  const { deleteItem, updateItem } = useItems();
  const { data: auth } = useAuth();
  const activeUser = auth?.users.find(u => Number(u.id) === Number(auth.activeUserId));

  const { selectedStoreId, addItemToStore, removeItemFromStore, stores, storeLists, syncItemDetails, addStore } =
    useStoreContext();

  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editName, setEditName] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPreferredStore, setEditPreferredStore] = useState<number | undefined>(undefined);
  const [showAddStore, setShowAddStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");

  const nameInputRef = useRef<HTMLInputElement>(null);

  function openEditDialog(item: Item) {
    setEditingItem(item);
    setEditName(item.name);
    setEditImage(item.imageUrl ?? "");
    setEditCategory(item.category ?? "other");
    setEditPreferredStore(item.preferredStoreId);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }

  function handleSaveEdit() {
    if (!editingItem) return;
    const updates = {
      name: editName,
      category: editCategory,
      imageUrl: editImage,
      preferredStoreId: editPreferredStore
    };
    updateItem(editingItem.id, updates);
    syncItemDetails(editingItem.id, {
      name: editName,
      imageUrl: editImage,
      category: editCategory
    });
    setEditingItem(null);
  }

  const targetStoreId = item.preferredStoreId ?? selectedStoreId;

  // Find the list entry for this item so we can remove it by listItemId
  const listEntry = targetStoreId
    ? storeLists[targetStoreId]?.find(li => li.item.id === item.id)
    : undefined;

  const isAdded = !!listEntry;

  // CHANGE 3: toggle — adds if not present, removes if already added
  const handleToggleStore = () => {
    if (!targetStoreId) return;
    if (isAdded && listEntry) {
      removeItemFromStore(targetStoreId, listEntry.id);
    } else {
      addItemToStore(targetStoreId, item, activeUser ? Number(activeUser.id) : undefined, activeUser?.name);
    }
  };

  const preferredStore = stores.find((s) => s.id === item.preferredStoreId);

  return (
    // CHANGE 1: compact card sizing for mobile
    <div
      className={`bg-card border rounded-xl p-1.5 flex flex-col transition shadow-sm hover:shadow-md overflow-hidden ${
        isAdded ? "border-primary/60" : ""
      }`}
    >

      {/* IMAGE — aspect-[4/3] is shorter than square */}
      <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-secondary/30 flex items-center justify-center">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl">
            {categoryIcons[item.category ?? "other"]}
          </span>
        )}
      </div>

      {/* TEXT — name always reserves 2-line height, category + store below */}
      <div className="mt-1.5 flex flex-col gap-0.5">
        <p className="font-semibold text-xs leading-tight line-clamp-2 min-h-[2rem]">
          {item.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {categoryLabels[item.category ?? "other"] ?? "📦 Other"}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {preferredStore
            ? `📍 ${preferredStore.name}`
            : selectedStoreId
            ? `→ ${stores.find((s) => s.id === selectedStoreId)?.name}`
            : "No store"}
        </p>
      </div>

      {/* SPACER — pushes actions to bottom */}
      <div className="flex-1" />

      {/* ACTIONS — always pinned to bottom */}
      <div className="flex items-center justify-between gap-1 pt-1 overflow-hidden">

        {/* Toggle add/remove */}
        <button
          onClick={handleToggleStore}
          disabled={!targetStoreId}
          className={`flex-1 min-w-0 text-xs px-1 py-1 rounded-lg border font-medium transition truncate ${
            isAdded
              ? "bg-primary text-primary-foreground border-primary active:bg-destructive active:border-destructive"
              : "bg-background border-border hover:bg-secondary active:bg-secondary"
          } disabled:opacity-40`}
        >
          {isAdded ? "✓ Added" : "Add"}
        </button>

        <div className="flex shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditDialog(item)}
            className="text-blue-500 hover:text-blue-600 h-6 w-6"
          >
            <Pencil className="w-3 h-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteItem(item.id)}
            className="text-red-500 hover:text-red-600 h-6 w-6"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={editingItem !== null} onOpenChange={() => { setEditingItem(null); setShowAddStore(false); setNewStoreName(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update the name, photo, category, or preferred store for this item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">

            <Input
              ref={nameInputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Item name"
            />

            <div className="space-y-3">
              {editImage && (
                <div className="w-28 h-28 rounded-xl overflow-hidden border">
                  <img src={editImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <input
                id="imageUpload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
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
                      setEditImage(canvas.toDataURL("image/jpeg", 0.7));
                    };
                  };
                  reader.readAsDataURL(file);
                }}
              />

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => document.getElementById("imageUpload")?.click()}>
                  Change Image
                </Button>
                {editImage && (
                  <Button type="button" variant="ghost" onClick={() => setEditImage("")}>
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="w-full border border-input bg-background text-foreground rounded-md p-2"
            >
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={editPreferredStore ?? ""}
              onChange={(e) => {
                if (e.target.value === "__add__") {
                  setShowAddStore(true);
                } else {
                  setEditPreferredStore(e.target.value ? Number(e.target.value) : undefined);
                  setShowAddStore(false);
                }
              }}
              className="w-full border border-input bg-background text-foreground rounded-md p-2"
            >
              <option value="">No preferred store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
              <option value="__add__">＋ Add new store...</option>
            </select>

            {showAddStore && (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="Store name"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newStoreName.trim()) {
                      const id = addStore(newStoreName.trim());
                      setEditPreferredStore(id);
                      setNewStoreName("");
                      setShowAddStore(false);
                    }
                    if (e.key === "Escape") {
                      setShowAddStore(false);
                      setNewStoreName("");
                    }
                  }}
                  className="h-8 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={() => {
                    if (!newStoreName.trim()) return;
                    const id = addStore(newStoreName.trim());
                    setEditPreferredStore(id);
                    setNewStoreName("");
                    setShowAddStore(false);
                  }}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs shrink-0"
                  onClick={() => { setShowAddStore(false); setNewStoreName(""); }}
                >
                  Cancel
                </Button>
              </div>
            )}

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}