export const createMiniProgramWorkBuddyCloud = () => ({
  auth: {
    getSession: async () => ({ data: { user: { id: "synthetic-owner", isAnonymous: false } }, error: null }),
    signInWithWechat: async () => ({ data: null, error: null })
  },
  database: { from: (_table: string): any => { throw new Error("Real network is disabled in tests"); } }
});
