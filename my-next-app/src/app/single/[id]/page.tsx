import { fetchMediaById } from '@/models/mediaModel';
import Image from 'next/image';

export default async function Single({ params }: { params: { id: string } }) {
  const mediaItem = await fetchMediaById(Number(params.id));

  if (!mediaItem) {
    return <div>Media not found</div>;
  }

  return (
    <div>
      <h1>{mediaItem.title}</h1>
      {mediaItem.media_type.includes('video') ? (
        <video width="640" height="400" controls>
          <source src={mediaItem.filename} type={mediaItem.media_type} />
        </video>
      ) : (
        <Image
          src={mediaItem.filename}
          alt={mediaItem.title}
          width={640}
          height={400}
        />
      )}
    </div>
  );
}
