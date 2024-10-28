import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    const { message, imageBase64 } = await request.json();
    console.log('Received message:', message);
    console.log('Received imageBase64:', imageBase64 ? 'Provided' : 'Not Provided');

    let mediaId;
    let uploadedImageUrl;

    // If there's an image, upload it to Cloudinary
    if (imageBase64) {
      console.log('Uploading image to Cloudinary...');
      uploadedImageUrl = await uploadBase64ToCloudinary(imageBase64);
      console.log('Image uploaded to Cloudinary successfully:', uploadedImageUrl);

      // Upload the Cloudinary image URL to Facebook
      console.log('Uploading image URL to Facebook...');
      mediaId = await createFacebookMediaObject(uploadedImageUrl);
      console.log('Image uploaded to Facebook successfully, mediaId:', mediaId);
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
          attached_media: [{ media_fbid: mediaId }],
        }),
        published: true, // or false for scheduling
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

// Upload base64 image to Cloudinary
async function uploadBase64ToCloudinary(base64String) {
  const response = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64String}`, {
    folder: 'facebook_posts', // Optional: specify a folder in Cloudinary
  });

  if (!response.secure_url) {
    throw new Error('Failed to upload image to Cloudinary');
  }

  return response.secure_url; // Return the Cloudinary URL
}

// Upload image URL to Facebook
async function createFacebookMediaObject(imageUrl) {
  const response = await fetch(`https://graph.facebook.com/v21.0/${process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID}/photos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_FACEBOOK_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: imageUrl, 
      published: false, // Not published immediately
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error response from Facebook:', errorData);
    throw new Error('Failed to upload image URL to Facebook');
  }

  const data = await response.json();
  return data.id; // Return media ID from Facebook
}
