var toId;
var fromId;
var toName;
var encrypt_to = new JSEncrypt();
var encrypt_from = new JSEncrypt();
var password;
var lastMessage = 0;
var messageInterval = 0;
var me = -1;
var sending = false;
var autodelete = false;
function load_friends(){
    $.get('/friends.php',function(data){
        data = JSON.parse(data);
        for(i=0;i<data.length;i++){
            $('#contactContainer').append('<div class="contact" data-user-id="'+data[i].id+'">'+data[i].full_name+'</div>')
        }
        if(findGetParameter('chat')!==null){
            $('.contact[data-user-id='+findGetParameter('chat')+']').trigger('click');
        }
    });
}
function getMyKeys(){
    var newKey = new JSEncrypt({default_key_size: 512});
    newKey.getKey();
    $.post('/getKey.php',{id:true},function(id){
        fromId = parseInt(id);
        $.post('/getKey.php',{public:true},function(publicKey){
            encrypt_from.setPublicKey(publicKey);
            plainPassswordForPrivateKeyEncryption = CryptoJS.lib.WordArray.random(512/8).toString();
            encryptedPasswordForPrivateKeyEncryption = encrypt_from.encrypt(plainPassswordForPrivateKeyEncryption);
            $.post('/getKey.php',{private:encryptedPasswordForPrivateKeyEncryption},function(encryptedPrivateKey){
                privateKey = JSON.parse(CryptoJS.AES.decrypt(encryptedPrivateKey, plainPassswordForPrivateKeyEncryption, {format: CryptoJSAesJson}).toString(CryptoJS.enc.Utf8));
                encrypt_from.setPrivateKey(privateKey);
            });
        });
    });
}
function init(){
    getMyKeys();
    load_friends();
    $('body').on('click','.contact',function(){
        toId = parseInt($(this).attr('data-user-id'));
        _this = this;
        console.log('Loading Friend');
        $.get('getFriendKey.php?id='+toId,function(data){
            $("#contactsClose").trigger('click');
            encrypt_to.setPublicKey(data);
            $("#message").attr('placeholder','Write a message...');
            $("#message").attr('disabled',false);
            toName = $(_this).html();
            $('#title').html(toName);
            getTopMessages();
        });
    });
    $('#message').keypress(function(e){
        if(e && e.keyCode == 13) {
            if(e.shiftKey){
                return true;
            } else {
                if(!sending){
                    sending = true;
                    plainMessage = $("#message").val();
                    $("#message").val('');
                    if(plainMessage!='')sendMessage(plainMessage);
                    else sending = false;
                }
                return false;
            }
        }
    })
    $(window).resize(function(){scrollToBottom()});
    $('.autoDelete').click(function(){
        if(autodelete){
            autodelete = false;
            $('.autoDelete').removeClass('enabled');
            $('.autoDelete').addClass('disabled');
        } else {
            autodelete = true;
            $('.autoDelete').removeClass('disabled');
            $('.autoDelete').addClass('enabled');
        }
    });
}
function getTopMessages(){
    console.log('Loading Last Messages');
    clearInterval(messageInterval);
    if(autodelete){
        params = {
            top:toId,
            delete:true
        }
    } else params = { top:toId};
    $.post('/getMessages.php',params,function(messages){
        messages = JSON.parse(messages);
        me = -1;
        $("#mc").html('');
        for(i = 0; i < messages.length; i++){
            message = messages[i];
            lastMessage = parseInt(message.id);
            if(message.uidFrom == fromId){
                key = encrypt_from.decrypt(message.keyFrom);
                message.message = CryptoJS.AES.decrypt(message.message, key, {format: CryptoJSAesJson}).toString(CryptoJS.enc.Utf8);
                if(me==1)
                    $("#mc .fromContainer:last-of-type").append('<div><div class="from"><div class="msgTitle">You</div>'+nl2br(message.message)+'</div></div>');
                else
                    $("#mc").append('<div class="fromContainer"><div><div class="from"><div class="msgTitle">You</div>'+nl2br(message.message)+'</div></div></div>')
                me = 1;
            } else {
                key = encrypt_from.decrypt(message.keyTo);
                message.message = CryptoJS.AES.decrypt(message.message, key, {format: CryptoJSAesJson}).toString(CryptoJS.enc.Utf8);
                if(me==0)
                    $("#mc .forContainer:last-of-type").append('<div><div class="for"><div class="msgTitle">'+toName+'</div>'+nl2br(message.message)+'</div></div>')
                else
                    $("#mc").append('<div class="forContainer"><div><div class="for"><div class="msgTitle">'+toName+'</div>'+nl2br(message.message)+'</div></div></div>')
                me = 0;
            }
        }
        scrollToBottom();
        messageInterval = setInterval(getMessages,500);
        $(window).focus(function() {
            console.log('focus');
            if (!messageInterval){
                console.log('set interval');
                messageInterval = setInterval(getMessages,500);
            }
        });

        $(window).blur(function() {
            clearInterval(messageInterval);
            messageInterval = 0;
        });
    });
}
function getMessages(){
    clearInterval(messageInterval);
    if(autodelete){
        params = {
            last:lastMessage,
            to:toId,
            delete:true
        }
    } else params = {last:lastMessage,to:toId};
    $.post('/getMessages.php',params,function(messages){
        atbottom = isAtBottom();
        messages = JSON.parse(messages);
        for(i = 0; i < messages.length; i++){
            message = messages[i];
            lastMessage = parseInt(message.id);
            if(message.uidFrom == fromId){
                key = encrypt_from.decrypt(message.keyFrom);
                message.message = CryptoJS.AES.decrypt(message.message, key, {format: CryptoJSAesJson}).toString(CryptoJS.enc.Utf8);
                if(me==1)
                    $("#mc .fromContainer:last-of-type").append('<div><div class="from"><div class="msgTitle">You</div>'+nl2br(message.message)+'</div></div>');
                else
                    $("#mc").append('<div class="fromContainer"><div><div class="from"><div class="msgTitle">You</div>'+nl2br(message.message)+'</div></div></div>')
                me = 1;
            } else {
                key = encrypt_from.decrypt(message.keyTo);
                message.message = CryptoJS.AES.decrypt(message.message, key, {format: CryptoJSAesJson}).toString(CryptoJS.enc.Utf8);
                if(me==0)
                    $("#mc .forContainer:last-of-type").append('<div><div class="for"><div class="msgTitle">'+toName+'</div>'+nl2br(message.message)+'</div></div>')
                else
                    $("#mc").append('<div class="forContainer"><div><div class="for"><div class="msgTitle">'+toName+'</div>'+nl2br(message.message)+'</div></div></div>')
                me = 0;
            }
        }
        scrollToBottom(atbottom);
        messageInterval = setInterval(getMessages,500);
    });
}
function sendMessage(plainMessage){
    key = CryptoJS.lib.WordArray.random(512/8).toString();
    keyFrom = encrypt_from.encrypt(key);
    keyTo = encrypt_to.encrypt(key);
    message = CryptoJS.AES.encrypt(plainMessage, key, {format: CryptoJSAesJson}).toString();
    if(autodelete)
        params={to:toId,keyFrom:keyFrom,keyTo:keyTo,message:message,autodelete:true};
    else params={to:toId,keyFrom:keyFrom,keyTo:keyTo,message:message};
    $.post('/sendMessage.php',params,function(data){
        sending = false;
        $("#message").focus();
    })
}
function nl2br( str ) {
    return str.replace(/([^>])\n/g, '$1<br/>');
}
function isAtBottom(){
    var psconsole = $('#mc');
    var currentScroll = psconsole.scrollTop();
    var newScroll = psconsole[0].scrollHeight - psconsole.height();
    //console.log(newScroll+':'+currentScroll);
    if(psconsole.length)
        if(newScroll - currentScroll < 5)
            return true;
        else return false;
    else return false;
}
function scrollToBottom(scroll = true){
    var psconsole = $('#mc');
    var currentScroll = psconsole.scrollTop() + 155;
    var newScroll = psconsole[0].scrollHeight - psconsole.height();
    if(psconsole.length && scroll)
        psconsole.scrollTop(newScroll);

}
function findGetParameter(parameterName) {
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
}
init();