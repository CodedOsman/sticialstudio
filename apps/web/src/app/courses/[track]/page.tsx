import { notFound } from 'next/navigation';
import { CourseTrackView } from '@/components/courses/CourseTrackView';
import { getCourseTrack, getCourseCatalog } from '@/lib/courses/catalog';

export async function generateStaticParams() {
  const catalog = getCourseCatalog();
  return catalog.map((track) => ({
    track: track.slug,
  }));
}

export default async function CourseTrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  const courseTrack = getCourseTrack(track);

  if (!courseTrack) {
    notFound();
  }

  return <CourseTrackView track={courseTrack} />;
}
