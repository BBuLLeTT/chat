$("#login").submit(function () {
    var username = $("#login input[name=user_name]").val();
    var p1 = $("#login input[name=p1]").val();
    var p2 = $("#login input[name=p2]").val();
    window.localStorage.userName = username;
    window.localStorage.authPass = MD5(p1);
    window.localStorage.userPass = MD5(p2);
    Chat.auth();
    return false;
});