'use client'

import { useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ApplicationWithJob, ApplicationStatus, RequiredDocuments } from '@/types/application'
import { ApplicationCard } from './ApplicationCard'
import { CompactApplicationRow } from './CompactApplicationRow'
import { GripVertical } from 'lucide-react'
import { ViewMode } from './ApplicationToolbar'

interface SortableItemProps {
  id: string
  children: React.ReactNode
}

function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* 드래그 핸들 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>
      <div className="pl-6">
        {children}
      </div>
    </div>
  )
}

interface PinnedSectionProps {
  pinnedApps: ApplicationWithJob[]
  viewMode: ViewMode
  pinnedIds: Set<string>
  onReorder: (newOrder: string[]) => void
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void
  onUpdateNotes: (id: string, notes: string) => void
  onUpdateDocuments: (id: string, documents: RequiredDocuments) => void
  onUpdateDeadline: (savedJobId: string, deadline: string) => void
  onDelete: (applicationId: string, savedJobId: string) => void
  onTogglePin: (savedJobId: string) => void
}

export function PinnedSection({
  pinnedApps,
  viewMode,
  pinnedIds,
  onReorder,
  onStatusChange,
  onUpdateNotes,
  onUpdateDocuments,
  onUpdateDeadline,
  onDelete,
  onTogglePin,
}: PinnedSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = pinnedApps.findIndex((a) => a.saved_job.id === active.id)
    const newIndex = pinnedApps.findIndex((a) => a.saved_job.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(pinnedApps, oldIndex, newIndex)
      onReorder(reordered.map((a) => a.saved_job.id))
    }
  }, [pinnedApps, onReorder])

  if (pinnedApps.length === 0) return null

  const sortableIds = pinnedApps.map((a) => a.saved_job.id)

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-xs font-medium text-blue-600">📌 고정됨 ({pinnedApps.length})</span>
        <span className="text-xs text-gray-400">드래그하여 순서 변경</span>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {pinnedApps.map((application) => (
              <SortableItem key={application.saved_job.id} id={application.saved_job.id}>
                {viewMode === 'card' ? (
                  <ApplicationCard
                    application={application}
                    onStatusChange={onStatusChange}
                    onUpdateNotes={onUpdateNotes}
                    onUpdateDocuments={onUpdateDocuments}
                    onUpdateDeadline={onUpdateDeadline}
                    onDelete={onDelete}
                    isPinned={true}
                    onTogglePin={onTogglePin}
                  />
                ) : (
                  <CompactApplicationRow
                    application={application}
                    onStatusChange={onStatusChange}
                    onUpdateNotes={onUpdateNotes}
                    onUpdateDocuments={onUpdateDocuments}
                    onUpdateDeadline={onUpdateDeadline}
                    onDelete={onDelete}
                    isPinned={true}
                    onTogglePin={onTogglePin}
                  />
                )}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
