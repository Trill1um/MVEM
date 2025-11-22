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

// Create compound unique index for name + category combination
produceSchema.index({ name: 1, category: 1 }, { unique: true });

const Produce = mongoose.model('produce', produceSchema);

export default Produce;

// { "produce": [
//   {
//     "_id":"6921761330eb35d5b620bf81",
//     "name":"apple",
//     "description":"a red fruit",
//     "category":"fruit",
//     "unit":"kg",
//     "images":[],
//     "createdAt":"2025-11-22T08:36:35.891Z",
//     "updatedAt":"2025-11-22T08:36:35.891Z",
//     "__v":0 
//   } , 
//   { 
//     "_id":"6921765c30eb35d5b620bf86",
//     "name":"carrot",
//     "description":"an orang root",
//     "category":"vegetable",
//     "unit":"box",
//     "images":[],
//     "createdAt":"2025-11-22T08:37:48.635Z",
//     "updatedAt":"2025-11-22T08:37:48.635Z",
//     "__v":0
//   },
//   { 
//     "_id":"6921767b30eb35d5b620bf8c",
//     "name":"carrot",
//     "description":"an orange fruit root",
//     "category":"fruit",
//     "unit":"box",
//     "images":[],
//     "createdAt":"2025-11-22T08:38:19.680Z",
//     "updatedAt":"2025-11-22T08:38:19.680Z",
//     "__v":0
//   }
// ]
// ,
// "message":"Produce catalog fetched successfully"
// }