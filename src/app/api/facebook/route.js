import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { message, imageUrl } = await request.json();
    console.log('Received message:', message);
    console.log('Received imageUrl:', imageUrl ? 'Provided' : 'Not Provided');

    let mediaId;
    if (imageUrl) {
      console.log('Uploading image URL to Facebook...');
      mediaId = await createFacebookMediaObject(imageUrl);
      console.log('Image uploaded successfully, mediaId:', mediaId);
    }

    
    console.log('Creating post on Facebook...');
    const response = await fetch(`https://graph.facebook.com/v21.0/${process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID}/feed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_FACEBOOK_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        message,
        ...(mediaId && {
          attached_media: [{ media_fbid: mediaId }]
        }),
        published: true // or false for scheduling
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to post to Facebook, error response:', errorData);
      throw new Error('Failed to post to Facebook: ' + errorData.error.message);
    }

    const data = await response.json();
    console.log('Post created successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Facebook API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to post to Facebook' }, { status: 500 });
  }
}

async function createFacebookMediaObject(imageUrl) {
  const response = await fetch(`https://graph.facebook.com/v21.0/${process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID}/photos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_FACEBOOK_ACCESS_TOKEN}`,
      'Content-Type': 'application/json', 
    },
    body: JSON.stringify({
      url: imageUrl, 
      published: false, 
    }),
  });

  if (!response.ok) {
    const errorData = await response.json(); 
    console.error('Error response from Facebook:', errorData);
    throw new Error('Failed to upload image URL to Facebook');
  }

  const data = await response.json();
  return data.id;
}
