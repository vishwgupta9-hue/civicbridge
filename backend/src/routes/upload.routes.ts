import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { uploadEvidence } from "../middleware/upload.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * POST /api/upload
 * Handles evidence file upload (photo/PDF) for authenticated citizens or institutions.
 * Returns the URL where the uploaded file is accessible.
 */
router.post(
  "/",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    uploadEvidence.single("file")(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            error: "File size exceeds the 5MB limit. Please upload a smaller photo or document.",
          });
        }
        return res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          error: err.message || "Failed to process file upload.",
        });
      }
      next();
    });
  },
  (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file was provided in the upload request. Please select a photo or document.",
      });
    }

    // Construct accessible path
    const fileUrl = `/uploads/${req.file.filename}`;

    res.status(201).json({
      success: true,
      message: "Evidence file uploaded successfully.",
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  }
);

export default router;
