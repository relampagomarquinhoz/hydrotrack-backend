require('dotenv').config();

const PORT = process.env.PORT || 3000;

const startTunnel = async () => {
  try {
    await new Promise(r => setTimeout(r, 2000));

    const ngrok = require('ngrok');

    // Compatível com ngrok v4 e v5 beta
    if (typeof ngrok.authtoken === 'function') {
      await ngrok.authtoken(process.env.NGROK_AUTHTOKEN);
    }

    const url = await ngrok.connect({
      addr:      PORT,
      authtoken: process.env.NGROK_AUTHTOKEN,
      proto:     'http',
    });

    console.log('');
    console.log('🌐 Ngrok tunnel ativo!');
    console.log('🔗 URL pública: ' + url);
    console.log('');
    console.log('Cole essa URL no seu app React Native:');
    console.log("  const API_URL = '" + url + "';");
    console.log('');
    console.log('⚠️  A URL muda a cada restart do ngrok (plano grátis).');
    console.log('');
  } catch (err) {
    console.error('❌ Erro no ngrok:', err.message);
    console.log('');
    console.log('💡 Tente rodar manualmente no terminal:');
    console.log('   npx ngrok http 3000');
  }
};

startTunnel();
