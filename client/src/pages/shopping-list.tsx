import { useState, useEffect, useCallback } from "react";
import { useStoreContext, aisleOrder } from "@/context/store-context";

import {
  ShoppingBag,
  CheckCircle2,
  Check,
  Package
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

/* ------------------------------------------------ */
/* TYPES                                            */
/* ------------------------------------------------ */

type StoreListItem = {
  id: number;
  quantity: number;
  completed: boolean;
  item: {
    id: number;
    name: string;
    imageUrl?: string;
    category?: string;
  };
};

/* ------------------------------------------------ */
/* SORT HELPER                                      */
/* ------------------------------------------------ */

function sortByAisle(items: StoreListItem[]) {
  return [...items].sort((a, b) => {
    const catA = a.item?.category ?? "other";
    const catB = b.item?.category ?? "other";

    return aisleOrder.indexOf(catA) - aisleOrder.indexOf(catB);
  });
}

/* ------------------------------------------------ */
/* GROUP ITEMS BY CATEGORY                          */
/* ------------------------------------------------ */

function groupItemsByCategory(items: StoreListItem[]) {
  const groups: Record<string, StoreListItem[]> = {};

  items.forEach(item => {
    const cat = item.item.category ?? "other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });

  return groups;
}

/* ------------------------------------------------ */
/* CATEGORY LABELS                                  */
/* ------------------------------------------------ */

const categoryLabels: Record<string, string> = {
  produce: "🥦 Produce",
  bakery: "🍞 Bakery",
  meat: "🥩 Meat",
  dairy: "🥛 Dairy",
  chilled: "🧊 Chilled",
  frozen: "❄ Frozen",
  pantry: "🥫 Pantry",
  household: "🧴 Household",
  other: "📦 Other"
};

/* ------------------------------------------------ */
/* STORE LIST ROW                                   */
/* ------------------------------------------------ */

function StoreListRow({ listItem }: { listItem: StoreListItem }) {

  const {
    selectedStoreId,
    updateItemQuantity,
    removeItemFromStore
  } = useStoreContext();

  const [imageError, setImageError] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);

  const hasImage = !!listItem.item?.imageUrl && !imageError;

  return (
    <>
      <Dialog open={showPhoto} onOpenChange={setShowPhoto}>
        <DialogContent className="max-w-lg border-border/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{listItem.item?.name}</DialogTitle>
          </DialogHeader>

          <div className="rounded-xl overflow-hidden bg-secondary/30">
            {hasImage ? (
              <img
                src={listItem.item.imageUrl}
                alt={listItem.item.name}
                className="w-full object-contain max-h-[60vh]"
              />
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <Package className="w-14 h-14 opacity-30" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-2xl border border-border/40 flex items-center justify-between p-4 shadow-sm">

        {/* LEFT */}

        <div className="flex items-center gap-4 flex-1">

          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-full border-2 border-primary/20"
            onClick={() =>
              removeItemFromStore(selectedStoreId!, listItem.id)
            }
          >
            <Check className="w-4 h-4 text-primary" />
          </Button>

          <h3 className="text-lg sm:text-xl font-semibold flex-1">
            {listItem.item?.name}
          </h3>

          <button
            onClick={() => hasImage && setShowPhoto(true)}
            className="bg-secondary/30 flex items-center justify-center overflow-hidden w-12 h-12 rounded-xl"
          >
            {hasImage ? (
              <img
                src={listItem.item.imageUrl}
                alt={listItem.item.name}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="w-5 h-5 text-muted-foreground/50" />
            )}
          </button>

        </div>

        {/* RIGHT – MOBILE FRIENDLY QUANTITY CONTROL */}

        <div className="flex items-center gap-1 bg-secondary/40 rounded-xl px-2 py-1">

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              updateItemQuantity(
                selectedStoreId!,
                listItem.id,
                listItem.quantity - 1
              )
            }
          >
            -
          </Button>

          <span className="w-6 text-center text-sm font-semibold">
            {listItem.quantity}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              updateItemQuantity(
                selectedStoreId!,
                listItem.id,
                listItem.quantity + 1
              )
            }
          >
            +
          </Button>

        </div>

      </div>
    </>
  );
}

/* ------------------------------------------------ */
/* SORTABLE CATEGORY                                */
/* ------------------------------------------------ */

function SortableCategory({
  category,
  items
}:{
  category:string
  items:StoreListItem[]
}){

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: category });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>

      <div
        {...listeners}
        className="text-sm font-bold text-muted-foreground mt-4 mb-2 cursor-grab active:cursor-grabbing"
      >
        {categoryLabels[category] ?? "📦 Other"}
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <StoreListRow key={item.id} listItem={item} />
        ))}
      </div>

    </div>
  );
}

/* ------------------------------------------------ */
/* MAIN PAGE                                        */
/* ------------------------------------------------ */

export default function ShoppingList(){

  const {
    selectedStoreId,
    setSelectedStoreId,
    stores,
    storeLists,
    sortByAisle: aisleSortingEnabled
  } = useStoreContext();

  const [orderedItems,setOrderedItems] = useState<StoreListItem[]>([]);
  const [categoryOrder,setCategoryOrder] = useState<string[]>([]);

  useEffect(() => {

    if (!selectedStoreId) {
      setOrderedItems([]);
      return;
    }

    const items = storeLists[selectedStoreId] || [];

    if (aisleSortingEnabled) {
      setOrderedItems(sortByAisle(items));
    } else {
      setOrderedItems(items);
    }

  }, [selectedStoreId, storeLists, aisleSortingEnabled]);

  useEffect(()=>{

    if (!selectedStoreId) return;

    const cats = Object.keys(groupItemsByCategory(orderedItems));

    const saved = localStorage.getItem(`aisle-order-${selectedStoreId}`);

    if (saved) {

      const savedOrder = JSON.parse(saved);

      const merged = [
        ...savedOrder,
        ...cats.filter(c => !savedOrder.includes(c))
      ];

      setCategoryOrder(merged);

    } else {

      setCategoryOrder(cats);

    }

  },[orderedItems, selectedStoreId]);

  const categoryGroups = groupItemsByCategory(orderedItems);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor,{
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = useCallback((event:DragEndEvent)=>{

    const {active,over} = event;
    if(!over || active.id===over.id) return;

    setCategoryOrder(prev=>{

      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);

      const newOrder = arrayMove(prev,oldIndex,newIndex);

      if (selectedStoreId) {
        localStorage.setItem(
          `aisle-order-${selectedStoreId}`,
          JSON.stringify(newOrder)
        );
      }

      return newOrder;

    });

  },[selectedStoreId]);

  const selectedStore = stores?.find(s=>s.id===selectedStoreId);

  const StoreTabs = () => (

    <div className="flex gap-2 mb-4 overflow-x-auto">

      {stores.map((store)=>(

        <button
          key={store.id}
          onClick={()=>setSelectedStoreId(store.id)}
          className={`px-3 py-2 rounded-lg border ${
            selectedStoreId===store.id
              ? "bg-primary text-white"
              : "bg-secondary"
          }`}
        >
          {store.name}
        </button>

      ))}

    </div>

  );

  return (

    <div className="max-w-3xl mx-auto space-y-6">

      <StoreTabs/>

      <h1 className="text-3xl font-bold flex items-center gap-3">
        <ShoppingBag className="w-8 h-8 text-primary"/>
        Shopping List
      </h1>

      {!selectedStoreId && (
        <div className="text-muted-foreground">
          Select a store tab above.
        </div>
      )}

      {selectedStoreId && selectedStore && (

        <>

          <h2 className="text-xl font-bold">
            {selectedStore.name}
          </h2>

          {orderedItems.length>0 && (

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >

              <SortableContext
                items={categoryOrder}
                strategy={verticalListSortingStrategy}
              >

                <div className="space-y-2">

                  {categoryOrder.map(category=>{

                    const items = categoryGroups[category];
                    if(!items) return null;

                    return(
                      <SortableCategory
                        key={category}
                        category={category}
                        items={items}
                      />
                    );

                  })}

                </div>

              </SortableContext>

            </DndContext>

          )}

          {orderedItems.length===0 && (

            <div className="text-center p-10 text-muted-foreground">

              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-primary"/>

              <p>{selectedStore.name} list is empty</p>

            </div>

          )}

        </>

      )}

    </div>

  );

}