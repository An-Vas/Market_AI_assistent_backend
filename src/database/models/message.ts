import { DataTypes, Model, NOW } from 'sequelize';
import { sequelize } from '../dbconfig';
import { Session } from './session';

export class Message extends Model {
  public id!: number;
  public sessionId!: number;
  public createDate!: Date;
  public text!: string;
  public senderType!: number;

   static associate(models: { Session: typeof Session }) {
    this.belongsTo(models.Session, {
      foreignKey: 'sessionId',     
      targetKey: 'sessionId',      
      as: 'session',
    });
  }

}

Message.init(
  {
    id: {
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    createDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    text: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    senderType: {
        type: DataTypes.SMALLINT,
        defaultValue: 1,
        allowNull: false,
    }
  },
  {
    sequelize,
    modelName: 'Message',
    tableName: 'messages',
    timestamps: false,
  },


);