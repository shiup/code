'use strict';

const https = require('https');
const fs = require('fs');
const express = require('express');
const os = require("os");
const url = require('url');
const crypto = require('crypto');

// TODO: refer to README on how you can create your own application TLS server credential
const options = {
    key: fs.readFileSync("../../credentials/server-priv-without-pwd.pem"),
    cert: fs.readFileSync("../../credentials/server-pub.pem")
};

////////////////////////////////////////////////////////////////////////
// TODO: customize this to your environment
const port = 4443;

const client_id = '0d66b6805d4c5e96df0e';
const client_secret = '89e0fed9704b5f858b679219d8e632e128d54499';

const authorization_endpoint = 'https://github.com/login/oauth/authorize';
const token_endpoint = 'https://github.com/login/oauth/access_token';
const userinfo_endpoint = 'https://api.github.com/user';
const redirect_uri = 'https://' + os.hostname() + ':' + port + '/redirect';
////////////////////////////////////////////////////////////////////////


const tk_ep = url.parse(token_endpoint);
const ui_ep = url.parse(userinfo_endpoint);

const app = express();

app.get('/az/oidc', (req, res) => {

    // Step1: redirect browser to OIDC provider for user to authenticate and provide consent
    let state = crypto.randomUUID();
    console.log(`Step1: [${state}] redirect user to authenticate and provide consent`);

    let oauthaz = authorization_endpoint + '?response_type=code';
    oauthaz += '&client_id=' + client_id;
    oauthaz += '&scope=' + encodeURIComponent('openid read:user user:email');
    oauthaz += '&redirect_uri=' + encodeURIComponent(redirect_uri);
    oauthaz += '&state=' + state;

    res.redirect(302, oauthaz);

});

app.get('/redirect', (req, res) => {
    // Step 2: handle the redirect from the oauth/oidc provider, after user authenticated & gave consent
    //         - this can be an error condition

    console.log(`Step2: [${req.query.state}] redirect back from oauth/oidc provider`);

    if (req.query.code) {
        // Step 2a: converting the code to access_token, and/or id_token

        let body = 'grant_type=authorization_code&code=' + req.query.code;
        body += '&client_id=' + client_id + '&client_secret=' + client_secret;
        body += '&redirect_uri=' + encodeURIComponent(redirect_uri);

        let options = {
            hostname: tk_ep.hostname,
            path: tk_ep.pathname,
            port: 443,
            method: 'POST',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                accept: 'application/json'
            },
            rejectUnauthorized: false,
            strictSSL: false,
            agent:false
        };

        console.log(`Step3: [${req.query.state}] exchanging the temporary code, ${req.query.code} to the access_token/id_token`);
        let reqcall = https.request(options, (myres) => {
            let access_response = '';
            myres.on('data', (d) => {
                myres.resume();
                access_response += d.toString();
            }).on('end', function() {

                console.log(`Step4: [${req.query.state}] Use the access_token to get the userinformation`);

                let tokenresp = JSON.parse(access_response);
                let access_token = tokenresp.access_token;

                // use the access_token to get userinfo 
                options.hostname = ui_ep.hostname;
                options.path = ui_ep.pathname;
                options.method = 'GET';
                delete options.headers['content-type'];
                options.headers.authorization = 'Bearer ' + tokenresp.access_token;
                options.headers['user-agent'] = 'Awesome-Wicked-Spoon-Chris-Team';

                // make the call to get userinfo
                var uresp = '';
                let infocall = https.get(options, (infores) => {
                    infores.on('data', (d) => {
                        infores.resume();
                        uresp += d.toString();
                    }).on('end', function() {
                        res.status(200).contentType('application/json').send(uresp);
                    });
                }).on('error', (e) => {
                    console.error('error with userinfo call', e);
                    res.send('<h1>error with userinfo call, check console</h1>');
                });



            }).on('error',  (e) => {
                console.error('error with token call', e);
                res.send('<h1>error with token call, check console</h1>');
            });
        });

        reqcall.write(body);
        reqcall.end();
    } else {
        // Step 2b: something goes wrong, this application did not receive the temporary authorization code
        console.log('Error in getting the temporary authorization code: ', req.query);
        res.send('<h1>something bad with oauth happen, check server log</h1>');
    }
});

app.get('*', (req, res) => {res.send('<h1>If you want to test this, make sure you enter https://<hostname>:4443/howoidcworks from the browser</h1>');});

const server = https.createServer(options, app);
server.listen(port, () => { 
    console.log(`listen at host: [${os.hostname()}] at port: [${port}]`);
    console.log(`  redirect_uri: [${redirect_uri}]`);
    console.log(`Open a browser, with location as https://${os.hostname()}:${port}/az/oidc`);
});

