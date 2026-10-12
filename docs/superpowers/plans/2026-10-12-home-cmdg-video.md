# Home CMDG video replacement

Goal: replace only the home CMDG key visual with the supplied 7-second clip.
Scope: portal HTML/video lifecycle; preserve other service assets and links.
Media: 480x854/24fps H264, CRF27, no audio, faststart; WebP first-frame poster.
Storage: public Vercel Blob, Seoul region, OIDC project connection; versioned URLs and one-year cache. No application proxy or binary added to deployment.
Acceptance: served clip/thumbnail 200, range requests 206, poster visible, only selected visible rail video plays; reduced motion/save-data retain poster. Real browser mobile/desktop and build verification.
Cost: fewer bytes than source, direct Blob delivery. Do not promise zero latency or a billing reduction without usage evidence.
Rollback: revert scoped portal commit; retain original and new assets for rollback.
