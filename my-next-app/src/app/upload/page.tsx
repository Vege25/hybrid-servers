import MediaForm from '@/components/MediaForm';
import { requireAuth } from '@/lib/authActions';

const Page = () => {
  requireAuth();
  return (
    <main>
      <h1 className="text-4xl font-bold">Upload</h1>
      <MediaForm />
    </main>
  );
};

export default Page;
