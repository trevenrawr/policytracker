// Copyright: Trevor DiMartino, T-bag Technologies, 2017
// email: trevor.dimartino@colorado.edu

var PTctrl;
PTctrl = function($scope, $log, $http, $timeout) {
  // So we can use $log through the {{}} interface in index.html
  $scope.$log =  $log;

  // Set up the initial model.  The user will get refreshed in $scope.initialize()
  $scope.last_updated = new Date(2017, 04, 17).toDateString();
  $scope.modalShown = false;

  // These will get updated in initialize later, after all the firebase stuff has loaded
  $scope.user = firebase.auth().currentUser;
  $scope.signedIn = Boolean($scope.user);

  $scope.billSearch = {
    'state': '',
    'bill_id': ''
  };

  $scope.stateList = [
    { code: 'al', name: 'Alabama' },
    { code: 'ak', name: 'Alaska' },
    { code: 'az', name: 'Arizona' },
    { code: 'ar', name: 'Arkansas' },
    { code: 'ca', name: 'California' },
    { code: 'co', name: 'Colorado' },
    { code: 'ct', name: 'Connecticut' },
    { code: 'de', name: 'Delaware' },
    { code: 'dc', name: 'District Of Columbia' },
    { code: 'fl', name: 'Florida' },
    { code: 'ga', name: 'Georgia' },
    { code: 'hi', name: 'Hawaii' },
    { code: 'id', name: 'Idaho' },
    { code: 'il', name: 'Illinois' },
    { code: 'in', name: 'Indiana' },
    { code: 'ia', name: 'Iowa' },
    { code: 'ks', name: 'Kansas' },
    { code: 'ky', name: 'Kentucky' },
    { code: 'la', name: 'Louisiana' },
    { code: 'me', name: 'Maine' },
    { code: 'md', name: 'Maryland' },
    { code: 'ma', name: 'Massachusetts' },
    { code: 'mi', name: 'Michigan' },
    { code: 'mn', name: 'Minnesota' },
    { code: 'ms', name: 'Mississippi' },
    { code: 'mo', name: 'Missouri' },
    { code: 'mt', name: 'Montana' },
    { code: 'ne', name: 'Nebraska' },
    { code: 'nv', name: 'Nevada' },
    { code: 'nh', name: 'New Hampshire' },
    { code: 'nj', name: 'New Jersey' },
    { code: 'nm', name: 'New Mexico' },
    { code: 'ny', name: 'New York' },
    { code: 'nc', name: 'North Carolina' },
    { code: 'nd', name: 'North Dakota' },
    { code: 'oh', name: 'Ohio' },
    { code: 'ok', name: 'Oklahoma' },
    { code: 'or', name: 'Oregon' },
    { code: 'pa', name: 'Pennsylvania' },
    { code: 'ri', name: 'Rhode Island' },
    { code: 'sc', name: 'South Carolina' },
    { code: 'sd', name: 'South Dakota' },
    { code: 'tn', name: 'Tennessee' },
    { code: 'tx', name: 'Texas' },
    { code: 'ut', name: 'Utah' },
    { code: 'vt', name: 'Vermont' },
    { code: 'va', name: 'Virginia' },
    { code: 'wa', name: 'Washington' },
    { code: 'wv', name: 'West Virginia' },
    { code: 'wi', name: 'Wisconsin' },
    { code: 'wy', name: 'Wyoming' }
  ];

  // Will get overwritten in the loadStates async callback later
  $scope.states = {};

  // Set up firebase authentication
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');

  firebase.auth().getRedirectResult().then(function(result) {
    if (result.credential) {
      // This gives you a Google Access Token. You can use it to access the Google API.
      // var token = result.credential.accessToken;
    }
    // Should run onAuthStateChanged after this completes...
  }).catch(function(error) {
    // Handle Errors here.
    var errorCode = error.code;
    var errorMessage = error.message;
    // The email of the user's account used.
    var email = error.email;
    // The firebase.auth.AuthCredential type that was used.
    var credential = error.credential;

    console.error(error);
  });

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in.  Should run once page loads?
      $timeout($scope.initialize());
    } else {
      $scope.user = null;
      $scope.signedIn = false;
    }
  });

  $scope.logIn = function () {
    firebase.auth().signInWithRedirect(provider);
  }

  $scope.logOut = function () {
    firebase.auth().signOut();
    $scope.user = null;
    $scope.signedIn = false;
  }

  // Set up firebase database
  $scope.saveStates = function () {
    firebase.database().ref('users/' + $scope.user.uid).set(
      {
        "last_updated": $scope.last_updated,
        "states": $scope.states
      }, function () {
        alert("Bill list saved successfully.");
      }
    );
  };

  $scope.loadStates = function () {
    firebase.database().ref('users/' + $scope.user.uid).once('value').then(
      function (snapshot) {
        if (snapshot.val()) {
          $scope.states = snapshot.val().states;

          if (typeof snapshot.val().last_updated === 'undefined') {
            $scope.last_updated = 'Unknown';
          } else {
            $scope.last_updated = snapshot.val().last_updated;
          }

          $timeout($scope.refreshBills());
        } else {
          // There's nothing to load!
        }
      }
    );
  }

  $scope.initialize = function () {
    $scope.user = firebase.auth().currentUser;
    $scope.signedIn = Boolean($scope.user);

    if ($scope.signedIn) {
      $scope.loadStates();
    }

    return true;
  }

  //Functions for adding bills
  $scope.addBillModal = function () {
    $scope.modalShown = true;
    $timeout(document.getElementById('stateSelect').focus());

    return true;
  };

  $scope.addBillModalSearch = function () {
    var searchString = 'state='+$scope.billSearch.state+'&bill_id='+$scope.billSearch.bill_id;

    $http.get(
      ('https://openstates.org/api/v1/bills/?apikey=dfd57ce6-3ef8-4b31-bd65-d37473067fac&' + searchString)
    ).then(
      function successCallback(response) {
        $scope.osdata = response.data;
      },

      function errorCallback(response) {
        alert('Oops.');
      }
    );

    // Put the focus back on state for a quick re-search
    document.getElementById('stateSelect').focus();

    return true;
  }

  $scope.fillBillDetails = function (os_id, bill_state_code, bill_id) {
    // Refresh the bill details in the model for the given bill
    var url = 'https://openstates.org/api/v1/bills/'+os_id+'/?apikey=dfd57ce6-3ef8-4b31-bd65-d37473067fac';

    $http.get(
      url
    ).then(
      function successCallback(response) {
        $scope.states[bill_state_code].bills[bill_id].os_data = response.data;
      },

      function errorCallback(response) {
        alert('Oops.');
      }
    );

    return true;
  }

  $scope.addBill = function (os_id) {
    // If we have none for this state, we need to insert it first
    if (typeof $scope.states[$scope.billSearch.state] === 'undefined') {
      function findState(candistate) {
        return candistate.code === $scope.billSearch.state;
      }
      $scope.states[$scope.billSearch.state] = {
        'state_name': $scope.stateList.find(findState).name,
        'show': true,
        'bills': {}
      };
    }

    var next_ref = firebase.database().ref('users/'+$scope.user.uid+'/states').push();

    $log.log('Added bill to state '+$scope.billSearch.state+' with id: '+next_ref.key);

    $scope.states[$scope.billSearch.state].bills[next_ref.key] = {
      "id": next_ref.key,
      "os_id": os_id,
      "notes": "",
      "topic": "",
      "issue": "",
      "next_date": "",
      "next_action": "",
      "os_data": {}
    };

    $scope.fillBillDetails(os_id, $scope.billSearch.state, next_ref.key);

    $scope.modalShown = false;

    return true;
  };

  $scope.refreshBills = function () {
    angular.forEach($scope.states, function(state, state_code) {
      angular.forEach(state.bills, function(bill, state_bill_id) {
        $scope.fillBillDetails(bill.os_id, state_code, state_bill_id);
      })
    });

    $scope.last_updated = new Date().toDateString();
  };

  $scope.toggleCollapse = function (st_code) {
    $log.log('Currently: '+$scope.states[st_code].show+' for state '+st_code);
    if ($scope.states[st_code].show === 'undefined') {
      // This default value is about to get flipped.
      $scope.states[st_code].show = false;
    }

    $scope.states[st_code].show = !$scope.states[st_code].show;
  }
};

app = angular.module('PolicyTracker', []).controller('PTctrl', PTctrl);

app.directive('modalDialog', function () {
  return {
    restrict: 'E',
    scope: {
      show: '='
    },
    replace: true, // Replace with the template below
    transclude: true, // we want to insert custom content inside the directive
    link: function(scope, element, attrs) {
      scope.dialogStyle = {};
      if (attrs.width)
        scope.dialogStyle.width = attrs.width;
      if (attrs.height)
        scope.dialogStyle.height = attrs.height;
      scope.hideModal = function () {
        scope.show = false;
      };
    },
    template: "<div class='ng-modal' ng-show='show'><div class='ng-modal-overlay' ng-click='hideModal()'></div><div class='ng-modal-dialog' ng-style='dialogStyle'><div class='ng-modal-dialog-content' ng-transclude></div></div></div>"
  };
});