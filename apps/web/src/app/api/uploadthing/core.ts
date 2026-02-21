import { auth } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/server";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f({
    image: { maxFileSize: "16MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) throw new UploadThingError("Unauthorized");
      return { clerkUserId: userId };
    })
    .onUploadComplete(({ file }) => {
      return { imageUrl: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
