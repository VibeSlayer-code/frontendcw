VIDEO DECODER SETUP INSTRUCTIONS
=================================

Follow these steps to decode the encrypted video files:

1. Download the Video Files
   - Go back to the courses page
   - Click on each course (1, 2, 3)
   - Click the "Download Video" button to download each output_encoded.mp4 file
   - Place all downloaded videos in the same folder as these decoder files

2. Make sure to have Node.js installed
   - Download from: https://nodejs.org/
   - Install the LTS version

3. Run setup.bat
   - Double-click setup.bat
   - This will install FFmpeg and required dependencies
   - Wait for the installation to complete

4. To run the decoder on a video file:
   - Open Command Prompt or PowerShell in this folder
   - Use the syntax: node decoder.js <mp4_file_name>
   
   Examples:
   - node decoder.js output_encoded1.mp4
   - node decoder.js output_encoded2.mp4
   - node decoder.js output_encoded3.mp4

The decoder will extract hidden messages from the video files using
multiple steganography layers (visual, audio, and metadata).

For support, contact the course administrator.
