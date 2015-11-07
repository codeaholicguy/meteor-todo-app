Tasks = new Meteor.Collection("tasks");

if (Meteor.isClient) {
    Meteor.subscribe("tasks");

    Template.body.helpers({
        tasks: function () {
            if (Session.get("hideCompleted")) {
                // If hide completed is checked, filter tasks
                return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
            } else {
                // Otherwise, return all of the tasks
                return Tasks.find({}, {sort: {createdAt: -1}});
            }
        },

        hideCompleted: function () {
            return Session.get("hideCompleted");
        },

        incompleteCount: function () {
            return Tasks.find({checked: {$ne: true}}).count();
        }
    });

    Template.body.events({
        "submit .new-task": function (event) {
            // Prevent default browser form submit
            event.preventDefault();

            // Get value from form element
            var text = event.target.text.value;

            Meteor.call("addTask", text);

            // Clear form
            event.target.text.value = "";
        },

        "click .toggle-checked": function () {
            // Set the checked property to the opposite of its current value
            Meteor.call("setChecked", this._id, !this.checked);
        },

        "click .delete": function () {
            Meteor.call("deleteTask", this._id);
        },

        "click .toggle-private": function () {
            Meteor.call("setPrivate", this._id, !this.private);
        },

        "change .hide-completed input": function (event) {
            Session.set("hideCompleted", event.target.checked);
        }
    });

    Template.task.helpers({
        isOwner: function () {
            return this.owner === Meteor.userId();
        }
    });

    Accounts.ui.config({
        passwordSignupFields: "USERNAME_ONLY"
    });
}

if (Meteor.isServer) {
    Meteor.startup(function () {
        // code to run on server at startup
        Meteor.publish("tasks", function () {
            return Tasks.find({
                $or: [
                    {private: {$ne: true}},
                    {owner: this.userId}
                ]
            });
        });

        Meteor.methods({
            addTask: function (text) {
                // Make sure the user is logged in before inserting a task
                if (!Meteor.userId()) {
                    throw new Meteor.Error("not-authorized");
                }

                var task = {
                    text: text,
                    createdAt: new Date(), // current time
                    owner: Meteor.userId(), // _id of logged in user
                    username: Meteor.user().username || Meteor.user().profile.name  // username of logged in user
                };

                Tasks.insert(task);
            },

            deleteTask: function (taskId) {
                var task = Tasks.findOne(taskId);

                if (task.private && task.owner !== Meteor.userId()) {
                    // If the task is private, make sure only the owner can delete it
                    throw new Meteor.Error("not-authorized");
                }

                Tasks.remove(taskId);
            },

            setChecked: function (taskId, setChecked) {
                var task = Tasks.findOne(taskId);

                if (task.private && task.owner !== Meteor.userId()) {
                    // If the task is private, make sure only the owner can delete it
                    throw new Meteor.Error("not-authorized");
                }

                Tasks.update(taskId, {$set: {checked: setChecked}});
            },

            setPrivate: function (taskId, setToPrivate) {
                var task = Tasks.findOne(taskId);

                // Make sure only the task owner can make a task private
                if (task.owner !== Meteor.userId()) {
                    throw new Meteor.Error("not-authorized");
                }

                Tasks.update(taskId, {$set: {private: setToPrivate}});
            }
        });
    });
}
