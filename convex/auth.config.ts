// convex/auth.config.ts
export default {
  providers: [
    {
      // Replace this with your actual Clerk Issuer URL
      // You can find this in your Clerk Dashboard under "JWT Templates" -> "New Template" -> "Convex"
      // Or it usually looks like: https://your-clerk-frontend-api.clerk.accounts.dev
      domain: "https://decent-earwig-56.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};