const { sequelize } = require('../config/database');
const User = require('./User');
const Friend = require('./Friend');
const Chat = require('./Chat');
const Group = require('./Group');
const GroupMember = require('./GroupMember');
const Post = require('./Post');
const Like = require('./Like');
const Comment = require('./Comment');
const Notification = require('./Notification');
const QRCodeFriend = require('./QRCodeFriend');
const Song = require('./Song');
const Story = require('./Story');
const StoryView = require('./StoryView');
const StoryReaction = require('./StoryReaction');
const StoryReply = require('./StoryReply');
const Call = require('./Call');
const GroupCall = require('./GroupCall');
const GroupCallParticipant = require('./GroupCallParticipant');
const VoiceMessage = require('./VoiceMessage');
const MessageReaction = require('./MessageReaction');
const MessageReply = require('./MessageReply');
const MessageForward = require('./MessageForward');
const ConversationKey = require('./ConversationKey');

// Friend requests / Friendship associations
User.hasMany(Friend, { foreignKey: 'senderId', as: 'SentRequests' });
Friend.belongsTo(User, { foreignKey: 'senderId', as: 'Sender' });

User.hasMany(Friend, { foreignKey: 'receiverId', as: 'ReceivedRequests' });
Friend.belongsTo(User, { foreignKey: 'receiverId', as: 'Receiver' });

// Chat associations
User.hasMany(Chat, { foreignKey: 'senderId', as: 'SentChats' });
Chat.belongsTo(User, { foreignKey: 'senderId', as: 'Sender' });

User.hasMany(Chat, { foreignKey: 'receiverId', as: 'ReceivedChats' });
Chat.belongsTo(User, { foreignKey: 'receiverId', as: 'Receiver' });

// Group associations
User.hasMany(Group, { foreignKey: 'createdBy', as: 'CreatedGroups' });
Group.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });

Group.hasMany(GroupMember, { foreignKey: 'groupId', as: 'Members' });
GroupMember.belongsTo(Group, { foreignKey: 'groupId' });

Group.hasMany(Chat, { foreignKey: 'groupId', as: 'Messages' });
Chat.belongsTo(Group, { foreignKey: 'groupId', as: 'Group' });

User.hasMany(GroupMember, { foreignKey: 'userId', as: 'GroupMemberships' });
GroupMember.belongsTo(User, { foreignKey: 'userId', as: 'User' });

// Post associations (Moments)
User.hasMany(Post, { foreignKey: 'userId', as: 'Posts' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'Author' });

Post.hasMany(Like, { foreignKey: 'postId', as: 'Likes' });
Like.belongsTo(Post, { foreignKey: 'postId' });

User.hasMany(Like, { foreignKey: 'userId', as: 'UserLikes' });
Like.belongsTo(User, { foreignKey: 'userId', as: 'User' });

Post.hasMany(Comment, { foreignKey: 'postId', as: 'Comments' });
Comment.belongsTo(Post, { foreignKey: 'postId' });

User.hasMany(Comment, { foreignKey: 'userId', as: 'UserComments' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'User' });

// Notification associations
User.hasMany(Notification, { foreignKey: 'userId', as: 'Notifications' });
Notification.belongsTo(User, { foreignKey: 'userId' });

// QR Code associations
User.hasOne(QRCodeFriend, { foreignKey: 'userId', as: 'QRCodeData' });
QRCodeFriend.belongsTo(User, { foreignKey: 'userId' });

// Story associations
User.hasMany(Story, { foreignKey: 'userId', as: 'Stories' });
Story.belongsTo(User, { foreignKey: 'userId', as: 'Author' });

Story.hasMany(StoryView, { foreignKey: 'storyId', as: 'Views' });
StoryView.belongsTo(Story, { foreignKey: 'storyId' });

Story.hasMany(StoryReaction, { foreignKey: 'storyId', as: 'Reactions' });
StoryReaction.belongsTo(Story, { foreignKey: 'storyId' });

Story.hasMany(StoryReply, { foreignKey: 'storyId', as: 'Replies' });
StoryReply.belongsTo(Story, { foreignKey: 'storyId' });

Story.belongsTo(Song, { foreignKey: 'musicId', as: 'Music' });
Song.hasMany(Story, { foreignKey: 'musicId', as: 'Stories' });

User.hasMany(StoryView, { foreignKey: 'viewerId', as: 'UserViews' });
StoryView.belongsTo(User, { foreignKey: 'viewerId', as: 'Viewer' });

User.hasMany(StoryReaction, { foreignKey: 'userId', as: 'UserReactions' });
StoryReaction.belongsTo(User, { foreignKey: 'userId', as: 'User' });

User.hasMany(StoryReply, { foreignKey: 'senderId', as: 'UserReplies' });
StoryReply.belongsTo(User, { foreignKey: 'senderId', as: 'Sender' });

// Call associations
User.hasMany(Call, { foreignKey: 'callerId', as: 'InitiatedCalls' });
Call.belongsTo(User, { foreignKey: 'callerId', as: 'Caller' });

User.hasMany(Call, { foreignKey: 'receiverId', as: 'ReceivedCalls' });
Call.belongsTo(User, { foreignKey: 'receiverId', as: 'Receiver' });

// GroupCall associations
Group.hasMany(GroupCall, { foreignKey: 'groupId', as: 'GroupCalls' });
GroupCall.belongsTo(Group, { foreignKey: 'groupId', as: 'Group' });

User.hasMany(GroupCall, { foreignKey: 'createdBy', as: 'CreatedGroupCalls' });
GroupCall.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });

// GroupCallParticipant associations
GroupCall.hasMany(GroupCallParticipant, { foreignKey: 'groupCallId', as: 'Participants' });
GroupCallParticipant.belongsTo(GroupCall, { foreignKey: 'groupCallId' });

User.hasMany(GroupCallParticipant, { foreignKey: 'userId', as: 'GroupCallMemberships' });
GroupCallParticipant.belongsTo(User, { foreignKey: 'userId', as: 'User' });

// Message Reactions associations
Chat.hasMany(MessageReaction, { foreignKey: 'messageId', as: 'Reactions', onDelete: 'CASCADE' });
MessageReaction.belongsTo(Chat, { foreignKey: 'messageId' });
MessageReaction.belongsTo(User, { foreignKey: 'userId', as: 'User' });
User.hasMany(MessageReaction, { foreignKey: 'userId', as: 'Reactions' });

// Message Reply associations
Chat.hasOne(MessageReply, { foreignKey: 'messageId', as: 'ReplyLink', onDelete: 'CASCADE' });
MessageReply.belongsTo(Chat, { foreignKey: 'messageId' });
MessageReply.belongsTo(Chat, { foreignKey: 'repliedToMessageId', as: 'ParentMessage' });

// Message Forward associations
Chat.hasOne(MessageForward, { foreignKey: 'messageId', as: 'ForwardLink', onDelete: 'CASCADE' });
MessageForward.belongsTo(Chat, { foreignKey: 'messageId' });
MessageForward.belongsTo(User, { foreignKey: 'forwardedBy', as: 'Forwarder' });

// Voice Message associations
VoiceMessage.belongsTo(User, { foreignKey: 'senderId', as: 'Sender' });
VoiceMessage.belongsTo(User, { foreignKey: 'receiverId', as: 'Receiver' });
VoiceMessage.belongsTo(Group, { foreignKey: 'groupId', as: 'Group' });

// Conversation Key associations
ConversationKey.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  Friend,
  Chat,
  Group,
  GroupMember,
  Post,
  Like,
  Comment,
  Notification,
  QRCodeFriend,
  Song,
  Story,
  StoryView,
  StoryReaction,
  StoryReply,
  Call,
  GroupCall,
  GroupCallParticipant,
  VoiceMessage,
  MessageReaction,
  MessageReply,
  MessageForward,
  ConversationKey,
};
