import mongoose  from "mongoose";

const produceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        maxlength: 100,
        minlength: 2
    },
    description: {
        type: String,
        required: [true, 'Product description is required'],
        trim: true,
        maxlength: 1000,
        minlength: 10
    },
    category: {
        type: String,
        required: [true, 'Product category is required'],
        trim: true,
        maxlength: 50
    },
    farmerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: [true, 'Farmer ID is required']
    },
    unit: {
        type: String,
        required: [true, 'Unit of measurement is required'],
        enum: ['kg', 'lbs', 'piece', 'dozen', 'box', 'sack'],
        trim: true
    },
    images: [{
        type: String,
        required: [true, 'Image URL is required']
    }],
},{timestamps: true});

const Produce = mongoose.model('produce', produceSchema);

export default Produce;