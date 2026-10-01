import { DataTypes, Model, NOW } from 'sequelize';
import { sequelize } from '../dbconfig';

export class Order extends Model {
  public id!: number;
  public userId!: number;
  public orderComposition!: string;
  public deliveryDate!: Date;
  public status!: string;
}

Order.init(
  {
    id: {
        autoIncrement: true,
		primaryKey: true,
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    orderComposition: {
      type: DataTypes.STRING,
      defaultValue: "Book",
      allowNull: false,
    },
    deliveryDate: {
        type: DataTypes.DATE,
	    allowNull: false,
		defaultValue: NOW,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: "Создано",
        allowNull: false,
    }
  },
  {
    sequelize,
    tableName: 'orders',
    timestamps: false,
  }
);