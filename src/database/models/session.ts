import { DataTypes, Model, NOW } from 'sequelize';
import { sequelize } from '../dbconfig';
import { Message } from './message';

export class Session extends Model {
  public id!: number;
  public sessionId!: number;
  public userId!: number;
  public createDate!: Date;
  public closeDate!: Date;
  public status!: number;

  static associate(models: { Message: typeof Message }) {
    this.hasMany(models.Message, {
      foreignKey: 'sessionId',
      as: 'messages',
    });
  }
}

Session.init(
  {
    id: {
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    createDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    closeDate: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    status: {
        type: DataTypes.SMALLINT,
        defaultValue: 1,
        allowNull: false,
    }
  },
  {
    sequelize,
    tableName: 'sessions',
    timestamps: false,
  },


);