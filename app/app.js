'use strict';

// Declare app level module which depends on views, and components
var app = angular.module('mraApp', ["ngRoute", "ngSanitize"]);
app.config(function($routeProvider) {
    $routeProvider
    .when("/", {
        templateUrl : "templateHolder.html",
        controller : "templateCtrl"
    });
});
app.controller("templateCtrl", function($scope){
});
