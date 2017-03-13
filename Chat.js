var Chat = function () {
    this.me = {};
    this.friend = {};
    var lastMessage = 0;
    var messageInterval = 0;
    var sending = false;
    var autodelete = false;
    this.init();
    this.listeners();
};

Chat.prototype.listeners = function () {
    $("#contactsOpen").click(function () {
        $('#contacts').addClass('show');
    });
    $("#contactsClose").click(function () {
        $('#contacts').removeClass('show');
    });
    $("#logout").click(function () {
        window.localStorage.removeItem('authPass');
        window.localStorage.removeItem('authPrivKey');
        window.localStorage.removeItem('authPubKey');
        window.localStorage.removeItem('userName');
        window.localStorage.removeItem('userPass');
        window.localStorage.removeItem('userPrivKey');
        window.localStorage.removeItem('userPubKey');
        window.localStorage.removeItem('id');
        window.location.href = '/logout';
        return false;
    });
};

Chat.prototype.init = function () {
    this.loadKeys();
    this.getFriends();
    console.log(this.me);
};

Chat.prototype.loadKeys = function () {
    this.me = {
        id: window.localStorage.id,
        user: {
            privKey: Crypt.btoU8(window.localStorage.userPrivKey),
            pubKey: Crypt.btoU8(window.localStorage.userPubKey)
        },
        auth: {
            privKey: Crypt.btoU8(window.localStorage.authPrivKey),
            pubKey: Crypt.btoU8(window.localStorage.authPubKey)
        }
    }
};

Chat.prototype.getFriends = function () {
    $.get('/chat/getFriends', function (data) {
        data = JSON.parse(data);
        for (i = 0; i < data.length; i++) {
            $('#contactContainer').append('<div class="contact" data-user-id="' + data[i].id + '">' + data[i].full_name + '</div>')
        }
        if (this.findGetParameter('chat') !== null) {
            $('.contact[data-user-id=' + this.findGetParameter('chat') + ']').trigger('click');
        }
    });
};
Chat.prototype.findGetParameter = function (parameterName) {
    var result = null,
        tmp = [];
    location.search
        .substr(1)
        .split("&")
        .forEach(function (item) {
            tmp = item.split("=");
            if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
        });
    return result;
};

Chat.auth = function (autocheck) {
    if (typeof autocheck === 'undefined')
        autocheck = false;
    if (typeof window.localStorage.authPass === 'undefined' || typeof window.localStorage.userPass === 'undefined')
        return false;
    $.get('/json/login/requestToken/' + window.localStorage.userName, function (e) {
        if (e.success) {
            var authHashedPrivKey = Crypt.btoU8(e.data.authPrivKey);
            var authNonce = Crypt.btoU8(e.data.authNonce);
            var token = e.data.token;
            window.localStorage.authPubKey = e.data.authPubKey;
            try {
                var res = sodium.crypto_secretbox_open_easy(authHashedPrivKey, authNonce, Crypt.toU8(window.localStorage.authPass));
            } catch (e) {
                if (!autocheck) alert('არასწორი ავტორიზაციის პაროლი');
                return false;
            }
            window.localStorage.authPrivKey = Crypt.fromU8(res);
            var signedMessage = sodium.crypto_sign(token, Crypt.btoU8(window.localStorage.authPrivKey), 'base64');
            $.post('/json/login/validateToken/' + window.localStorage.userName, {message: signedMessage}, function (e) {
                if (e.success) {
                    var keys = e.keys;
                    var userHashedPrivKey = Crypt.btoU8(keys.userPrivKey);
                    var userNonce = Crypt.btoU8(keys.userNonce);
                    window.localStorage.userPubKey = keys.userPubKey;
                    try {
                        var res = sodium.crypto_secretbox_open_easy(userHashedPrivKey, userNonce, Crypt.toU8(window.localStorage.userPass));
                    } catch (e) {
                        if (!autocheck) alert('არასწორი პაროლი');
                        $.get('/logout');
                        return false;
                    }
                    window.localStorage.userPrivKey = Crypt.fromU8(res);
                    window.localStorage.id = e.keys.id;
                    window.location.href = '/login';
                } else if (!autocheck)
                    alert(e.error);
                else window.location.href = '/logout';
            });
        } else if (!autocheck) alert(e.error);
    });
};