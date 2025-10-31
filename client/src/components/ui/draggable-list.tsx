import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function DraggableItem({ id, children, disabled = false }: DraggableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center ${isDragging ? "z-50" : ""}`}
      {...attributes}
    >
      {!disabled && (
        <button
          className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}

interface DraggableListProps {
  items: any[];
  onReorder: (items: any[]) => void;
  renderItem: (item: any, index: number) => React.ReactNode;
  keyExtractor: (item: any) => string;
  disabled?: boolean;
}

export function DraggableList({
  items,
  onReorder,
  renderItem,
  keyExtractor,
  disabled = false,
}: DraggableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((item) => keyExtractor(item) === active.id);
      const newIndex = items.findIndex((item) => keyExtractor(item) === over?.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }
  }

  if (disabled || items.length === 0) {
    return (
      <>
        {items.map((item, index) => (
          <div key={keyExtractor(item)} className="flex items-center">
            <div className="flex-1">{renderItem(item, index)}</div>
          </div>
        ))}
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(keyExtractor)} strategy={verticalListSortingStrategy}>
        {items.map((item, index) => (
          <DraggableItem key={keyExtractor(item)} id={keyExtractor(item)}>
            {renderItem(item, index)}
          </DraggableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}