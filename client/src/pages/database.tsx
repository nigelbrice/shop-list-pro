import { useState, useMemo } from "react";
import { useItems } from "@/context/items-context";
import { ItemCard } from "@/components/item-card";
import { ItemDialog } from "@/components/item-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import BarcodeScanner from "@/components/barcode-scanner";
import { lookupBarcode } from "@/lib/productLookup";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Search, Loader2, Database as DbIcon, Library } from "lucide-react";

type SortOption = "name_asc" | "name_desc" | "newest" | "oldest" | "category";

const categoryLabels: Record<string, string> = {
  produce:   "🥦 Produce",
  bakery:    "🍞 Bakery",
  meat:      "🥩 Meat",
  dairy:     "🥛 Dairy",
  chilled:   "🧊 Chilled",
  frozen:    "❄ Frozen",
  pantry:    "🥫 Pantry",
  beverages: "🍾 Beverages",
  household: "🧴 Household",
  other:     "📦 Other",
};

export default function Database() {

  const { items } = useItems();
  const isLoading = false;

  const [dialogOpen, setDialogOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  /* These hold scanned product info passed into the dialog */
  const [newItemName, setNewItemName] = useState("");
  const [newItemImage, setNewItemImage] = useState("");

  const categories = useMemo(() => {
    if (!items) return [];
    const cats = Array.from(
      new Set(items.map((i: any) => i.category).filter(Boolean))
    ) as string[];
    return cats.sort();
  }, [items]);

  const filteredAndSortedItems = useMemo(() => {
    if (!items) return [];

    let result = items.filter((item: any) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    result.sort((a: any, b: any) => {
      switch (sortBy) {
        case "name_asc":   return a.name.localeCompare(b.name);
        case "name_desc":  return b.name.localeCompare(a.name);
        case "newest":     return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "oldest":     return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case "category":   return (a.category || "").localeCompare(b.category || "");
        default:           return 0;
      }
    });

    return result;
  }, [items, search, sortBy, categoryFilter]);

  /* ------------------------------------------------ */
  /* BARCODE HANDLER — now actually looks up the item */
  /* ------------------------------------------------ */

  async function handleBarcodeScan(barcode: string) {
    setScannerOpen(false);
    setScanLoading(true);
    setScanError(null);

    try {
      const result = await lookupBarcode(barcode);

      if (!result || !result.name) {
        setScanError(`No product found for barcode ${barcode}. You can add it manually.`);
        setNewItemName("");
        setNewItemImage("");
      } else {
        setNewItemName(result.name);
        setNewItemImage(result.image ?? "");
      }
    } catch (err) {
      setScanError("Barcode lookup failed. Please check your connection and try again.");
      setNewItemName("");
      setNewItemImage("");
    } finally {
      setScanLoading(false);
      setDialogOpen(true);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary/50" />
        <p className="font-medium animate-pulse">Loading database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-6">

        <div className="hidden sm:block">
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-foreground flex items-center gap-2">
            <DbIcon className="w-4 h-4 text-primary/80" />
            Grocery Index
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage all your products and build your catalog.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => {
            setNewItemName("");
            setNewItemImage("");
            setScanError(null);
            setDialogOpen(true);
          }}>
            Add Item
          </Button>

          <Button onClick={() => {
            setScanError(null);
            setScannerOpen(true);
          }} disabled={scanLoading}>
            {scanLoading
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Looking up...</>
              : "Scan Barcode"
            }
          </Button>
        </div>

      </div>

      {/* Scan error banner */}
      {scanError && (
        <div className="bg-orange-500/10 border border-orange-500/30 text-orange-700 dark:text-orange-400 rounded-xl px-4 py-3 text-sm flex justify-between items-center">
          <span>{scanError}</span>
          <button onClick={() => setScanError(null)} className="ml-4 font-bold">✕</button>
        </div>
      )}

      {/* Search + Filters */}
      <div className="bg-card p-2 sm:p-3 rounded-2xl border border-border/50 shadow-sm flex flex-col sm:flex-row gap-3">

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 bg-secondary/30 border-transparent focus-visible:bg-background text-base rounded-xl"
          />
        </div>

        {/* Category Pills */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1 rounded-full border text-sm whitespace-nowrap ${
                categoryFilter === "all" ? "bg-primary text-black" : "bg-secondary"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full border text-sm whitespace-nowrap ${
                  categoryFilter === cat ? "bg-primary text-black" : "bg-secondary"
                }`}
              >
                {categoryLabels[cat] ?? cat}
              </button>
            ))}
          </div>
        )}

        {/* Sort */}
        <div className="w-full sm:w-[200px]">
          <Select value={sortBy} onValueChange={(val: SortOption) => setSortBy(val)}>
            <SelectTrigger className="h-12 bg-secondary/30 border-transparent rounded-xl text-base">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest Added</SelectItem>
              <SelectItem value="oldest">Oldest Added</SelectItem>
              <SelectItem value="name_asc">Alphabetical (A-Z)</SelectItem>
              <SelectItem value="name_desc">Alphabetical (Z-A)</SelectItem>
              <SelectItem value="category">By Category</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>

      {/* Item Grid */}
      {filteredAndSortedItems.length > 0 ? (
        <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {filteredAndSortedItems.map((item: any) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-12 bg-card border border-border/50 border-dashed rounded-3xl min-h-[300px]">
          <div className="w-8 h-8 bg-secondary rounded-xl flex items-center justify-center mb-4">
            <Library className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold font-display text-foreground mb-2">
            No items found
          </h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            {search || categoryFilter !== "all"
              ? "We couldn't find anything matching your filters."
              : "Your database is empty. Add some items to get started."}
          </p>
          {!search && categoryFilter === "all" && (
            <Button onClick={() => setDialogOpen(true)}>
              Add First Item
            </Button>
          )}
        </div>
      )}

      {/* Add / Edit Item Dialog */}
      <ItemDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setNewItemName("");
            setNewItemImage("");
          }
        }}
        defaultName={newItemName}
        defaultImage={newItemImage}
      />

      {/* Barcode Scanner — only mounted when open. The scanner component
          handles its own safe shutdown before calling onClose/onScan,
          so React never unmounts it while the camera is still running. */}
      {scannerOpen && (
        <BarcodeScanner
          key="barcode-scanner"
          onScan={handleBarcodeScan}
          onClose={() => setScannerOpen(false)}
        />
      )}

    </div>
  );
}