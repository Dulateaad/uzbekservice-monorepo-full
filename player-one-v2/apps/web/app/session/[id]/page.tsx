import { VideoPlayerMocap } from "@/components/VideoPlayerMocap";
import { SkeletonViewer3D } from "@/components/SkeletonViewer3D";
import { ActionTimeline } from "@/components/ActionTimeline";

export function generateStaticParams() {
  return [{ id: "demo-session" }, { id: "new" }];
}

export default function SessionPage({ params }: { params: { id: string } }) {
  const { id } = params;
  return (
    <main className="mx-auto max-w-5xl p-8 space-y-8">
      <h1 className="text-xl font-semibold">Сессия {id}</h1>
      <p className="text-slate-400 text-sm">
        ТЗ §6.1 — видео с MoCap-оверлеем, биомеханика и ТТД. Данные: GET{" "}
        <code className="text-blue-400">/mocap/&#123;session_id&#125;</code>,{" "}
        <code className="text-blue-400">/actions/&#123;session_id&#125;</code>.
      </p>
      <VideoPlayerMocap />
      <div className="grid md:grid-cols-2 gap-6">
        <SkeletonViewer3D />
        <ActionTimeline />
      </div>
    </main>
  );
}
