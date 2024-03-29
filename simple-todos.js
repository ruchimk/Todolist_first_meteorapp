Tasks = new Mongo.Collection("tasks");

if (Meteor.isClient) {
    // At the top of our client code
    Meteor.subscribe("tasks");
    // This code only runs on the client
    // Replace the existing Template.body.helpers
    Template.body.helpers({
        tasks: function() {
            if (Session.get("hideCompleted")) {
                // If hide completed is checked, filter tasks
                return Tasks.find({
                    checked: {
                        $ne: true
                    }
                }, {
                    sort: {
                        createdAt: -1
                    }
                });
            } else {
                // Otherwise, return all of the tasks
                return Tasks.find({}, {
                    sort: {
                        createdAt: -1
                    }
                });
            }
        },
        hideCompleted: function() {
            return Session.get("hideCompleted");
        },
        // Add to Template.body.helpers
        incompleteCount: function() {
            return Tasks.find({
                checked: {
                    $ne: true
                }
            }).count();
        }
    });
    // Inside the if (Meteor.isClient) block, right after Template.body.helpers:
    Template.body.events({
        "submit .new-task": function(event) {
            // This function is called when the new task form is submitted
            var text = event.target.text.value;
            // replace Tasks.insert( ... ) with:
            Meteor.call("addTask", text);
            // Clear form
            event.target.text.value = "";
            // Prevent default form submit
            return false;
        },
        // Add to Template.body.events
        "change .hide-completed input": function(event) {
            Session.set("hideCompleted", event.target.checked);
        }
    });
    // In the client code, below everything else
    Template.task.events({
        "click .toggle-checked": function() {
            // replace Tasks.update( ... ) with:
            Meteor.call("setChecked", this._id, !this.checked);
        },
        "click .delete": function() {
            // replace Tasks.remove( ... ) with:
            Meteor.call("deleteTask", this._id);;
        },
        // Add an event for the new button to Template.task.events
        "click .toggle-private": function() {
            Meteor.call("setPrivate", this._id, !this.private);
        }
    });
    // Define a helper to check if the current user is the task owner
    Template.task.helpers({
        isOwner: function() {
            return this.owner === Meteor.userId();
        }
    });
    // At the bottom of the client code
    Accounts.ui.config({
        passwordSignupFields: "USERNAME_ONLY"
    });
}

// At the bottom of simple-todos.js, outside of the client-only block
Meteor.methods({
    addTask: function(text) {
        // Make sure the user is logged in before inserting a task
        if (!Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }

        Tasks.insert({
            text: text,
            createdAt: new Date(),
            owner: Meteor.userId(),
            username: Meteor.user().username
        });
    },
    deleteTask: function(taskId) {
        Tasks.remove(taskId);
        var task = Tasks.findOne(taskId);
        if (task.private && task.owner !== Meteor.userId()) {
            // If the task is private, make sure only the owner can delete it
            throw new Meteor.Error("not-authorized");
        }

    },
    setChecked: function(taskId, setChecked) {
        Tasks.update(taskId, {
            $set: {
                checked: setChecked
            }
        });
        // Inside the setChecked method
        var task = Tasks.findOne(taskId);
        if (task.private && task.owner !== Meteor.userId()) {
            // If the task is private, make sure only the owner can check it off
            throw new Meteor.Error("not-authorized");
        }

    },
    // Add a method to Meteor.methods called setPrivate
    setPrivate: function(taskId, setToPrivate) {
        var task = Tasks.findOne(taskId);

        // Make sure only the task owner can make a task private
        if (task.owner !== Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }

        Tasks.update(taskId, {
            $set: {
                private: setToPrivate
            }
        });
    }
});

// At the bottom of simple-todos.js
if (Meteor.isServer) {
    Meteor.publish("tasks", function() {
        return Tasks.find({
            $or: [{
                private: {
                    $ne: true
                }
            }, {
                owner: this.userId
            }]
        });
    });
}
