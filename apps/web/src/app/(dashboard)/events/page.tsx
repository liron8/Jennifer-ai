/**
 * Events Hub Page (Pro Feature)
 */

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Events Hub</h1>
          <span className="px-2 py-0.5 text-xs bg-brand-500 text-white rounded">PRO</span>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600">
          + New Event
        </button>
      </div>
      <div className="border rounded-lg bg-card p-6 min-h-[400px] flex items-center justify-center text-muted-foreground">
        Events kanban board will be implemented here
      </div>
    </div>
  );
}
