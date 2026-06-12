const { Notification } = require('../models');

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    return res.status(200).json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ message: 'Server error retrieving notifications.' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json(notification);
  } catch (error) {
    console.error('Mark notification error:', error);
    return res.status(500).json({ message: 'Server error updating notification.' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, isRead: false } }
    );
    return res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all notifications error:', error);
    return res.status(500).json({ message: 'Server error updating notifications.' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    await notification.destroy();
    return res.status(200).json({ message: 'Notification deleted successfully.', notificationId });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ message: 'Server error deleting notification.' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
