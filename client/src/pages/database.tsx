import { useState, useMemo } from "react";
import { useItems } from "@/hooks/use-items";
import { ItemCard } from "@/components/item-card";
import { ItemDialog } from "@/components/item-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2, Database as DbIcon, Library } from "lucide-react";

type SortOption = "name_asc" | "name_desc" | "newest" | "oldest" | "category";

export default function Database() {
  const { data: items, isLoading } = useItems();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = useMemo(() => {
    if (!items) return [];
    const cats = Array.from(new Set(items.map(i => i.category).filter(Boolean) as string[]));
    return cats.sort();
  }, [items]);

  const filteredAndSortedItems = useMemo(() => {
    if (!items) return [];

    let result = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "category": return (a.category || "").localeCompare(b.category || "");
        default: return 0;
      }
    });

    return result;
  }, [items, search, sortBy, categoryFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary/50" />
        <p className="font-medium animate-pulse">Loading database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-foreground flex items-center gap-2">
            <DbIcon className="w-4 h-4 text-primary/80" />
            Grocery Index
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage all your products, add notes, and build your catalog.
          </p>
        </div>
        <ItemDialog />
      </div>


      <div className="bg-card p-2 sm:p-3 rounded-2xl border border-border/50 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
            className="pl-10 h-12 bg-secondary/30 border-transparent focus-visible:bg-background text-base rounded-xl"
          />
        </div>
        {categories.length > 0 && (
          <div className="w-full sm:w-[180px]">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-12 bg-secondary/30 border-transparent rounded-xl text-base" data-testid="select-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 shadow-xl">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="w-full sm:w-[200px]">
          <Select value={sortBy} onValueChange={(val: SortOption) => setSortBy(val)}>
            <SelectTrigger className="h-12 bg-secondary/30 border-transparent rounded-xl text-base" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/50 shadow-xl">
              <SelectItem value="newest">Newest Added</SelectItem>
              <SelectItem value="oldest">Oldest Added</SelectItem>
              <SelectItem value="name_asc">Alphabetical (A-Z)</SelectItem>
              <SelectItem value="name_desc">Alphabetical (Z-A)</SelectItem>
              <SelectItem value="category">By Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredAndSortedItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {filteredAndSortedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-12 bg-card border border-border/50 border-dashed rounded-3xl min-h-[300px]">
          <div className="w-8 h-8 bg-secondary rounded-xl flex items-center justify-center mb-4">
            <Library className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold font-display text-foreground mb-2">No items found</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            {search || categoryFilter !== "all"
              ? "We couldn't find anything matching your filters."
              : "Your database is empty. Add some items to get started."}
          </p>
          {!search && categoryFilter === "all" && <ItemDialog />}
        </div>
      )}
    </div>
  );
}
