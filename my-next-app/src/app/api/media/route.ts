import { getSession, requireAuth } from '@/lib/authActions';
import { fetchData } from '@/lib/functions';
import { postMedia } from '@/models/mediaModel';
import { MediaItem } from '@sharedTypes/DBTypes';
import { MediaResponse, UploadResponse } from '@sharedTypes/MessageTypes';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  requireAuth();

  try {
    // TODO: get the form data from the request
    const formData = await request.formData();
    // TODO: get the token from the cookie
    const token = cookies().get('session')?.value;
    // TODO: send the form data to the upload server. See apiHooks from previous classes.
    const uploadResult = await fetchData<UploadResponse>(
      (process.env.UPLOAD_SERVER as string) + '/upload',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      },
    );

    // TODO: if the upload response is valid, add the media to the database
    if (!uploadResult.data) {
      return new NextResponse('Error uploading media', { status: 500 });
    }
    // TODO: get title, description, size and type from the form data
    // TODO: get the filename from the upload response
    // TODO: create a media item object, see what postMedia funcion in mediaModel wants for input.

    if (!formData.get('title') || !formData.get('description')) {
      return new NextResponse('Title and description are required', {
        status: 400,
      });
    }

    const mediaItem: Omit<MediaItem, 'media_id' | 'created_at' | 'thumbnail'> =
      {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        filesize: uploadResult.data.filesize,
        media_type: uploadResult.data.media_type,
        filename: uploadResult.data.filename,
        user_id: getSession()?.user_id as number,
      };

    // TODO: use the postMedia function from the mediaModel to add the media to the database. Since we are putting data to the database in the same app, we dont need to use a token.
    const postResult = await postMedia(mediaItem);

    if (!postResult) {
      return new NextResponse('Error adding media to database', {
        status: 500,
      });
    }

    const uploadResponse: MediaResponse = {
      message: 'Media added to database',
      media: postResult,
    };

    return new NextResponse(JSON.stringify(uploadResponse), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error((error as Error).message, error);
    return new NextResponse((error as Error).message, { status: 500 });
  }
}
