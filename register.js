$("#register").submit(function () {
    var username = $("#register input[name=user_name]").val();
    var fullname = $("#register input[name=full_name]").val();
    var p1 = $("#register input[name=p1]").val();
    var p12 = $("#register input[name=p12]").val();
    var p2 = $("#register input[name=p2]").val();
    var p22 = $("#register input[name=p22]").val();
    $.get('/json/register/validateUser/'+username,function (e) {
        if(e.available){
            if(p1.length < 6 || p2.length < 6) {
                alert('პაროლი უნდა შედგებოდეს 6 ან მეტი სიმბოლოსგან');
                return false;
            }
            if(p1 != p12 || p2 != p22) {
                alert('პაროლები არ ემთხვევა');
                return false;
            }
            var authPass = Crypt.toU8(MD5(p1));
            var userPass = Crypt.toU8(MD5(p2));
            var authChain = sodium.crypto_sign_keypair();
            var auth = {'privKey' : authChain.privateKey, 'pubKey': authChain.publicKey};
            var userChain = sodium.crypto_box_keypair();
            var user = {'privKey' : userChain.privateKey, 'pubKey': userChain.publicKey};
            var authNonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
            var userNonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
            var authHashedPrivKey = sodium.crypto_secretbox_easy(Crypt.U8tob(auth.privKey), authNonce, authPass,'uint8array');
            console.log(authHashedPrivKey);
            var userHashedPrivKey = sodium.crypto_secretbox_easy(Crypt.U8tob(user.privKey), userNonce, userPass,'uint8array');
            $.post('/json/register/submit',{
                username: username,
                fullname: fullname,
                auth: {
                    privKey: Crypt.U8tob(authHashedPrivKey),
                    pubKey: Crypt.U8tob(auth.pubKey),
                    nonce: Crypt.U8tob(authNonce)
                },
                user: {
                    privKey: Crypt.U8tob(userHashedPrivKey),
                    pubKey: Crypt.U8tob(user.pubKey),
                    nonce: Crypt.U8tob(userNonce)
                }
            },function (e) {
                if(e.success)
                    window.location.href = '/login';
                else alert(e.error);
            });
        } else alert('მომხმარებელის სახელი დაკავებულია');
    });
    return false;
});