import { useState, useEffect, useCallback, useRef } from "react";
import { useStoreContext } from "@/context/store-context";
import { useStores, useCreateStore, useDeleteStore, useStoreList, useUpdateStoreListItem, useRemoveFromStoreList, useReorderStoreList } from "@/hooks/use-stores";
import { ShoppingBag, Loader2, CheckCircle2, GripVertical, Plus, Minus, Check, Package, Store, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { StoreWithCount, StoreListItemWithItem } from "@shared/schema";
import { cn } from "@/lib/utils";

const PRESET_STORES = [
  "Tesco", "Asda", "Sainsbury's", "Morrisons", "Aldi", "Lidl",
  "Waitrose", "M&S Food", "Co-op", "Iceland", "Costco", "Amazon Fresh",
];

// ── Store List Row ─────────────────────────────────────────────────────────────

function StoreListRow({ listItem, storeId }: { listItem: StoreListItemWithItem; storeId: number }) {
  const updateMutation = useUpdateStoreListItem(storeId);
  const removeMutation = useRemoveFromStoreList(storeId);
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className="group relative bg-card rounded-2xl border border-border/40 overflow-hidden flex flex-row items-center p-3 sm:p-4 gap-3 shadow-sm"
      data-testid={`list-item-${listItem.id}`}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => removeMutation.mutate(listItem.id)}
        className="w-10 h-10 rounded-full border-2 border-primary/20 hover:bg-primary/10 hover:border-primary transition-all duration-200 shrink-0"
        disabled={removeMutation.isPending}
        data-testid={`button-remove-${listItem.id}`}
      >
        {removeMutation.isPending
          ? <Loader2 className="w-5 h-5 animate-spin text-primary" />
          : <Check className="w-5 h-5 text-primary" />}
      </Button>

      <div className="bg-secondary/30 flex items-center justify-center overflow-hidden shrink-0 w-12 h-12 rounded-xl">
        {listItem.item.imageUrl && !imageError ? (
          <img src={listItem.item.imageUrl} alt={listItem.item.name}
            onError={() => setImageError(true)} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-6 h-6 text-muted-foreground/50" />
        )}
      </div>

      <div className="flex flex-col flex-1 justify-center min-w-0">
        <h3 className="font-bold text-foreground text-base truncate" data-testid={`text-name-${listItem.id}`}>
          {listItem.item.name}
        </h3>
        {listItem.item.category && (
          <span className="text-xs text-primary/70 font-medium truncate">{listItem.item.category}</span>
        )}
        {listItem.item.notes && (
          <p className="text-xs text-muted-foreground truncate">{listItem.item.notes}</p>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 bg-secondary/30 rounded-full px-1 py-1 shrink-0">
        <Button variant="ghost" size="icon"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-background shadow-sm"
          onClick={() => updateMutation.mutate({ listItemId: listItem.id, quantity: listItem.quantity - 1 })}
          disabled={listItem.quantity <= 1 || updateMutation.isPending}
          data-testid={`button-decrease-${listItem.id}`}>
          <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
        <span className="w-6 sm:w-8 text-center font-bold text-sm sm:text-base tabular-nums"
          data-testid={`text-quantity-${listItem.id}`}>{listItem.quantity}</span>
        <Button variant="ghost" size="icon"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-background shadow-sm"
          onClick={() => updateMutation.mutate({ listItemId: listItem.id, quantity: listItem.quantity + 1 })}
          disabled={updateMutation.isPending}
          data-testid={`button-increase-${listItem.id}`}>
          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
      </div>
    </div>
  );
}

function SortableRow({ listItem, storeId }: { listItem: StoreListItemWithItem; storeId: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: listItem.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
      <div {...attributes} {...listeners}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-grab active:cursor-grabbing transition-colors shrink-0"
        data-testid={`drag-handle-${listItem.id}`}>
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <StoreListRow listItem={listItem} storeId={storeId} />
      </div>
    </div>
  );
}

// ── Store Tabs ─────────────────────────────────────────────────────────────────

function StoreTabs({
  stores,
  selectedStoreId,
  onSelect,
  onNewStore,
}: {
  stores: StoreWithCount[];
  selectedStoreId: number | null;
  onSelect: (id: number) => void;
  onNewStore: () => void;
}) {
  const tabsRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={tabsRef}
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      data-testid="store-tabs"
    >
      {stores.map(store => {
        const isActive = selectedStoreId === store.id;
        return (
          <button
            key={store.id}
            onClick={() => onSelect(store.id)}
            data-testid={`tab-store-${store.id}`}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-border hover:shadow-sm"
            )}
          >
            {store.name}
            {store.itemCount > 0 && (
              <span className={cn(
                "text-xs font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center",
                isActive
                  ? "bg-white/25 text-white"
                  : "bg-primary/12 text-primary"
              )}
                data-testid={`tab-count-${store.id}`}>
                {store.itemCount}
              </span>
            )}
          </button>
        );
      })}
      <button
        onClick={onNewStore}
        data-testid="button-new-store-tab"
        className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-sm font-semibold text-muted-foreground hover:text-foreground border border-dashed border-border/60 hover:border-border hover:bg-card whitespace-nowrap shrink-0 transition-all duration-200"
      >
        <Plus className="w-4 h-4" />
        New list
      </button>
    </div>
  );
}

// ── Create Store Panel ──────────────────────────────────────────────────────────

function CreateStorePanel({ onCreated, onDismiss }: { onCreated: (id: number) => void; onDismiss: () => void }) {
  const [mode, setMode] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const createMutation = useCreateStore();

  const handleCreate = async () => {
    const name = mode === "custom" ? customName.trim() : mode;
    if (!name) return;
    const store = await createMutation.mutateAsync(name);
    onCreated(store.id);
  };

  return (
    <div className="flex flex-col gap-3 p-5 bg-card rounded-2xl border border-border/50 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Add a store list</p>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <Select value={mode} onValueChange={setMode}>
        <SelectTrigger className="bg-secondary/50 border-transparent" data-testid="select-store-name">
          <SelectValue placeholder="Select a store..." />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border/50 shadow-xl">
          {PRESET_STORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          <SelectItem value="custom">Custom store name...</SelectItem>
        </SelectContent>
      </Select>
      {mode === "custom" && (
        <Input placeholder="Enter store name" value={customName}
          onChange={e => setCustomName(e.target.value)} autoFocus
          data-testid="input-custom-store"
          className="bg-secondary/50 border-transparent focus-visible:border-primary" />
      )}
      <Button
        onClick={handleCreate}
        disabled={!mode || (mode === "custom" && !customName.trim()) || createMutation.isPending}
        className="hover-lift"
        data-testid="button-create-store"
      >
        {createMutation.isPending
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <><Plus className="w-4 h-4 mr-2" />Create List</>}
      </Button>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────────

export default function ShoppingList() {
  const { selectedStoreId, setSelectedStoreId } = useStoreContext();
  const { data: stores, isLoading: storesLoading } = useStores();
  const { data: listItems, isLoading: listLoading } = useStoreList(selectedStoreId);
  const reorderMutation = useReorderStoreList(selectedStoreId);
  const deleteMutation = useDeleteStore();

  const [orderedItems, setOrderedItems] = useState<StoreListItemWithItem[]>([]);
  const [showCreateStore, setShowCreateStore] = useState(false);
  const hasInitialized = useRef(false);
  const prevStoreIdRef = useRef<number | null | undefined>(undefined);
  const saveOrderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const storeChanged = selectedStoreId !== prevStoreIdRef.current;
    prevStoreIdRef.current = selectedStoreId;

    if (storeChanged) {
      hasInitialized.current = false;
    }

    if (!listItems) {
      if (storeChanged) setOrderedItems([]);
      return;
    }

    if (listItems.length === 0) {
      setOrderedItems([]);
      hasInitialized.current = false;
      return;
    }

    if (!hasInitialized.current) {
      hasInitialized.current = true;
      setOrderedItems(
        [...listItems].sort((a, b) => {
          if (a.listOrder == null && b.listOrder == null) return 0;
          if (a.listOrder == null) return 1;
          if (b.listOrder == null) return -1;
          return a.listOrder - b.listOrder;
        })
      );
      return;
    }

    setOrderedItems(prev => {
      const currentIds = new Set(listItems.map(i => i.id));
      const prevIds = new Set(prev.map(i => i.id));
      const keptItems = prev
        .filter(i => currentIds.has(i.id))
        .map(i => listItems.find(r => r.id === i.id) || i);
      const addedItems = listItems.filter(i => !prevIds.has(i.id));
      if (addedItems.length === 0) return keptItems;

      const addedWithOrder = addedItems.filter(i => i.listOrder != null).sort((a, b) => a.listOrder! - b.listOrder!);
      const addedWithoutOrder = addedItems.filter(i => i.listOrder == null);
      const keptWithOrder = keptItems.filter(i => i.listOrder != null);
      const keptWithoutOrder = keptItems.filter(i => i.listOrder == null);
      if (addedWithOrder.length === 0) return [...keptItems, ...addedWithoutOrder];
      const allWithOrder = [...keptWithOrder, ...addedWithOrder].sort((a, b) => a.listOrder! - b.listOrder!);
      return [...allWithOrder, ...keptWithoutOrder, ...addedWithoutOrder];
    });
  }, [listItems, selectedStoreId]);

  useEffect(() => {
    if (orderedItems.length === 0) return;
    const hasUnsaved = orderedItems.some(i => i.listOrder == null);
    if (!hasUnsaved) return;
    if (saveOrderTimerRef.current) clearTimeout(saveOrderTimerRef.current);
    saveOrderTimerRef.current = setTimeout(() => {
      reorderMutation.mutate(orderedItems.map(i => i.id));
    }, 600);
    return () => { if (saveOrderTimerRef.current) clearTimeout(saveOrderTimerRef.current); };
  }, [orderedItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedItems(prev => {
      const oldIndex = prev.findIndex(i => i.id === active.id);
      const newIndex = prev.findIndex(i => i.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      reorderMutation.mutate(reordered.map(i => i.id));
      return reordered;
    });
  }, [reorderMutation]);

  const selectedStore = stores?.find(s => s.id === selectedStoreId);

  if (storesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary/50" />
        <p className="font-medium animate-pulse">Loading...</p>
      </div>
    );
  }

  const hasNoStores = !stores || stores.length === 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="text-center sm:text-left pt-4 pb-2 border-b border-border/50">
        <h1 className="text-3xl sm:text-5xl font-bold font-display text-foreground flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4 justify-center sm:justify-start">
          <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
          Shopping List
        </h1>
      </div>

      {hasNoStores ? (
        <div className="flex flex-col items-center justify-center text-center p-12 bg-gradient-to-b from-card to-secondary/20 rounded-3xl border border-border/50 shadow-sm min-h-[350px]">
          <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mb-6 shadow-sm">
            <Store className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold font-display text-foreground mb-3">No store lists yet</h3>
          <p className="text-muted-foreground text-lg max-w-sm mb-8">
            Create a list for each store you shop at to stay organised.
          </p>
          <Button onClick={() => setShowCreateStore(true)} className="hover-lift rounded-xl px-8 h-12 text-base" data-testid="button-first-store">
            <Plus className="w-4 h-4 mr-2" />
            Create your first list
          </Button>
        </div>
      ) : (
        <>
          <StoreTabs
            stores={stores}
            selectedStoreId={selectedStoreId}
            onSelect={(id) => { setSelectedStoreId(id); setShowCreateStore(false); }}
            onNewStore={() => setShowCreateStore(v => !v)}
          />
        </>
      )}

      {showCreateStore && (
        <CreateStorePanel
          onCreated={(id) => {
            setSelectedStoreId(id);
            setShowCreateStore(false);
          }}
          onDismiss={() => setShowCreateStore(false)}
        />
      )}

      {selectedStoreId && selectedStore && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-foreground">{selectedStore.name}</h2>
              {!listLoading && (
                <span className="text-sm text-muted-foreground">
                  {orderedItems.length === 0
                    ? "Empty"
                    : `${orderedItems.length} item${orderedItems.length === 1 ? "" : "s"}`}
                </span>
              )}
              {listLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <a href="/database"><Plus className="w-4 h-4 mr-1" />Add Items</a>
              </Button>
              <Button
                variant="ghost" size="icon"
                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => { deleteMutation.mutate(selectedStore.id); setSelectedStoreId(null); }}
                disabled={deleteMutation.isPending}
                data-testid="button-delete-store"
                title={`Delete ${selectedStore.name} list`}
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {orderedItems.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {orderedItems.map(listItem => (
                    <SortableRow key={listItem.id} listItem={listItem} storeId={selectedStoreId} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {!listLoading && orderedItems.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center p-10 bg-gradient-to-b from-card to-secondary/20 rounded-3xl border border-border/50 shadow-sm">
              <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-4 shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold font-display text-foreground mb-2">{selectedStore.name} list is empty</h3>
              <p className="text-muted-foreground max-w-sm">
                Head to the database to add items to your {selectedStore.name} list.
              </p>
            </div>
          )}
        </>
      )}

      {!selectedStoreId && !hasNoStores && !showCreateStore && (
        <div className="flex flex-col items-center justify-center text-center p-10 text-muted-foreground">
          <Store className="w-10 h-10 mb-3 text-muted-foreground/40" />
          <p>Select a store tab above to see its list.</p>
        </div>
      )}
    </div>
  );
}
