/**
 * Desktop shell for CAGE BOSS II: THE BUYBACK. The same shell as the first game
 * (electron/main.cjs), pointed at the sequel's build (dist-sequel/) and its own save folder.
 */
process.env.CAGEBOSS_GAME = 'sequel';
require('./main.cjs');
