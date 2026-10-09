// Returns the PUBLIC config the browser needs (anon key is public by design).
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    adminEmail: process.env.ADMIN_EMAIL || 'vikaskdem@gmail.com'
  });
};
